const base_dashboard_url = '/superset/dashboard_json/'
const base_slice_url = '/superset/explore_json/table/'

const dashboard_title_id = '#dashboard_title'
const dashboard_content_id = '#data_dash'

const slice_height_unit = 110

//echart 图表参数 - 统一风格
const text_color = "#fff"
const background_color = "#333"
const colors=['#fad797','#59ccf7','#c3b4df']

//echart风格
const chart_style = 'dark' //html要相应引入主题js文件

const current_url = window.location.href

var verbose_map  //存放列名的别名

var filter_paramets = []
var filter_form = {}
 if (current_url.indexOf('?') > -1){
    var paramets = current_url.split('?')[1].split('&')
    paramets.forEach(function(val, index, arr){
        var v = val.split('=')
        if (v[1] !== '') {
            //暂时单选
            filter_paramets.push({
                col:v[0],
                op:"in",
                val:[v[1]]
            })
            filter_form[v[0]] = v[1]
        }
        
    })
 }

function read_dashboard(dashboard_id) {
     
    var get_dashboat_url

    var slice_width_unit = Math.floor(document.documentElement.clientWidth / 12) - 1
    //请求数据
    $.get(base_dashboard_url + dashboard_id).done(function (response) {
        // 先拿这个图表的参数
        console.log(response)
        //初始化
        $(dashboard_title_id).children().remove()

        //权限问题提醒
        if (response.dashboard.status == 401) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">'+ response.message +'</div>')
            return
        }
        
        //其他错误
        if (response.dashboard.status !== undefined) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
            return
        }

        //标题
        $(dashboard_title_id).append('<h2  style="margin-left: 10px">'+response.dashboard.dashboard_title+'</h2>')

        //每个slice
        response.dashboard.slices.forEach(function(val,index, arr){
            
            //postition顺序和slice顺序不一样
            var position
            for (var i = 0; i <= response.dashboard.position_json.length; i++) {
                if (response.dashboard.position_json[i].slice_id == val.slice_id) {
                    position = response.dashboard.position_json[i]
                    break
                }
            }
            //位置,有可能没有postion,但我们在设计的时候尽量避免这样情况出现
            if (position == undefined) {
                position = {
                    col:1,
                    row:0,
                    size_x:4,
                    size_y:4,
                }
            }
            
            //console.log(position)

            var table_id = val.form_data.datasource.split('__')[0]

            var form_data = val.form_data

            if(filter_paramets.length > 0 && val.form_data.viz_type !== "filter_box"){
                form_data.extra_filters = filter_paramets
            }

            var url = base_slice_url + table_id  + '?form_data=' + JSON.stringify(val.form_data)

            //console.log(url)
            //TODO:这里是异步请求，放回数据有先后，顺势有区别，需要用postition来调整参数
            verbose_map =  response.verbose_map

            add_slice(position, url, val.slice_name, slice_width_unit)
        })
   }).fail(function(){
     $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
   })
}


function add_slice(position, url, slice_name, slice_width_unit) {
  
    //console.log(response)
    var slice_id = 'slice_cell' + position['slice_id']
    var slice_height = slice_height_unit * position['size_y']
    var slice_width = slice_width_unit * position['size_x']
    var slice_top = slice_height_unit  * position['row'] + 98
    var slice_left = slice_width_unit * (position['col'] - 1) + 5
    
    $.get(url).done(function (response) {

        console.log(response)
        
        $(dashboard_content_id).append('<div style="position: absolute;width:'+
            slice_width+'px;height:'+
            slice_height+'px;left:'+
            slice_left+'px;top:'+
            slice_top+'px;"><div id="'+
            slice_id +'" style="height:'+
            (slice_height-2)+'px;width:'+
            (slice_width-2)+'px;"></div></div>'
        )
        console.log(response.form_data.viz_type)

        switch(response.form_data.viz_type){
            // 做表单
            case 'filter_box':
              form_dom = generate_form(response,　slice_name)
              $('#'+slice_id).append(form_dom)
              break

            //做表
            case 'table':
              $('#'+slice_id).append('<table id="'+
                slice_id +'Table" class="table" style="height:'+
                (slice_height-3)+'px;width:'+
                (slice_width-3)+'px;"></table>')
              $('#'+slice_id+'Table').bootstrapTable('destroy').bootstrapTable(generate_table(response,　slice_name))
              $('#'+slice_id+'Table').bootstrapTable('hideLoading')
              break

            //画图
            default:
              var myChart= echarts.init(document.getElementById(slice_id), chart_style)
              generate_chart(myChart, response,　slice_name)
        }

    }).fail(function(){
        $(dashboard_content_id).append('<div style="position: absolute;width:'+
            slice_width+'px;height:'+
            slice_height+'px;left:'+
            slice_left+'px;top:'+
            slice_top+'px;"><div id="'+
            slice_id +'" style="height:'+
            (slice_height-2)+'px;width:'+
            (slice_width-2)+'px;"><div class="alert alert-warning" role="alert">数据加载失败</div></div></div>'
        )
    })

}

//表单
function generate_form(response,　slice_name) {
    var dom = '<form method="get"  role="form">'
    for (var i in response.data)  {
        dom += '<label for="'+ i +'">'+i+'</label>'
        dom  += '<select class="form-control" name='+ i +'>'
        dom += '<option></option>'
        response.data[i].forEach(function(val,index,arr){
            if (filter_form[i] == val.id) {
               dom += '<option value="'+ val.id +'" selected = "selected">' + val.text + '</option>' 
            } else {
               dom += '<option value="'+ val.id +'">' + val.text + '</option>'     
            }
        })
        dom += '</select>'
    }
    dom += '<button type="submit" class="btn-info">筛选</button>'
    dom += '</form>'
    return dom
}


//boostrap-table
function generate_table(response,　slice_name) {

    function genarate_fileds(datas){
        var fields = [{field: '', title: '序号',formatter: function (value, row, index) {return index + 1;}}]
        datas.forEach(function(val, index, arr){
            fields.push({
                field: val,
                title: verbose_map[response.form_data.datasource][val], //别名转化
                sortable: true
            })
        })
        return fields
    }

    return table_option = {
        //search: true,
        pagination: true,
        pageNumber: 1,
        pageSize: 8,
        pageList: [10, 20, 30, 50],
        cache: false,
        //height:'80%',
        paginationPreText: "上一页",
        paginationNextText: "下一页",
        striped: true,
        showRefresh: false,
        //sortName:'CreateTime',
        //sortOrder:'desc',
        //showColumns:true,
        //toolbar: '#toolbar',
        //singleSelect: true,           // 单选checkbox
        //
        //showExport: true,     //下载
        //exportDataType: "all",
        //exportTypes: ['excel'],
        columns: genarate_fileds(response.data.columns),
        data: response.data.records,
    }

}

//基本柱状图数据
function generate_chart(mychart, data, slice_name) {
    //构建图表
    var option

    //console.log(data.form_data.viz_type)

    //TODO:后面不断添加其他图表类型
    switch(data.form_data.viz_type)
    {
        case 'dist_bar':
          option = dist_bar_viz(data.data, data.form_data.datasource)
          break;
        case 'line':
          option = time_line_viz(data.data)
          break;
        case 'pie':
          option = pie_viz(data.data)
          break;
        case 'country_map':
          option = china_map(data.data)
          break;
        case 'big_number':
          option = big_number_viz(data.data)
          break;
        default:
          //option = china_map(data.data)
          option = {}
          console.log('pass')
    }

    //图表共同参数的设置
    if (option.title == undefined) {
            option.title = {
            //标题
            text: slice_name,
            textAlign: 'left',

        }
    }

    option.toolbox = {  
        show : true,
        left: '85%',
        feature : {  
           saveAsImage: {show: true, title:'下载'},
           restore: {show: true},
           //dataZoom: {show: true}, //地图，热力图
        }  
    }

    switch(data.form_data.viz_type)
    {
        case 'dist_bar':
          option.toolbox.feature.magicType = {
            type: ['line', 'bar', 'stack', 'tiled']
          }
          break;

        case 'line':
          option.toolbox.feature.magicType = {
            type: ['line', 'bar', 'stack', 'tiled']
          }
          option.dataZoom = {show:true}
          break;
        case 'pie':
          // option = pie_viz(df)
          console.log('pass')
          break;
        case 'country_map':
          // option = pie_viz(df)
          //mychart.on('brushselected', renderBrushed)
          console.log('pass')
          break;
        case 'big_number':
          option.title.push({
            text: slice_name,
            textAlign: 'left',
           })
          break;
        default:
           console.log('pass')
    }

    mychart.setOption(option, true)

}

//每个图形独立出来数据

//非时间序列的柱状图数据
function gene_bar_series(data, legend, type='bar') {
        var serie = [];
        data.forEach(function(val,index,arr){
            var item = {
                name:legend[index],
                type: type,
                barMaxWidth: 60,
                barGap: "10%",
                data: val,
                // label: {
                //     normal: {
                //         show: true,
                //         position: 'top',
                //         formatter: function(d) {return d.value;}
                //         }
                //     }
            }
            serie.push(item);
        })
        return serie
}


//饼图
function pie_viz(data) {
    // 数据适配echart格式
    var option = {}
    var values = []
    var legend = []
    data.forEach(function(val,index, arr){
       values.push({
            'value':val.y,
            'name': val.x
       })
       legend.push(val.x)        
    })
    option = {
        legend:{
            //orient: 'vertical',
            left: '15%',
            top: 24,
            data: legend,

        },
        tooltip : {
            trigger: 'item',
        },
        series: {
            type: 'pie',
            radius : '55%',
            center: ['50%', '60%'],
            data: values,
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }
    }
    return option
}    


//柱状图
function dist_bar_viz(data, table_id) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    data.forEach(function(val,index, arr){
        var tmp_values = []
        val.values.forEach(function(v,i, arr){
           tmp_values.push(v.y)
           if (index==0){
               xAxis_values.push(v.x)
           }
        })
        values.push(tmp_values)
        legend.push(verbose_map[table_id][val.key])     
    })

    option = {
        legend:{
            //orient: 'horizontal',
            //type: 'scroll',
            left: '15%',
            top: 24,
            data: legend,
        },
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values
            }
        ],
        yAxis : [
            {
                type : 'value'
            }
        ],
        series : gene_bar_series(values, legend)
    }

    return option
}


//时间-折线
//柱状图
function time_line_viz(data) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    data.forEach(function(val,index, arr){
        var tmp_values = []
        val.values.forEach(function(v,i, arr){
           tmp_values.push(v.y)
           if (index==0){
               xAxis_values.push(numberToDatetime(v.x))
           }
        })
        values.push(tmp_values)
        legend.push(val.key[0])     
    })

    option = {
        legend:{
            //orient: 'horizontal',
            //type: 'scroll',
            left: '15%',
            top: 24,
            data: legend,
        },
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values
            }
        ],
        yAxis : [
            {
                type : 'value'
            }
        ],
        series : gene_bar_series(values, legend, type='line')
    }

    return option
}


//折线图（大数字）
function big_number_viz(data){
    var option = {}
    var values = []
    var xAxis_values = []
    data.data.forEach(function(val,index, arr){
       values.push(val[1])
       xAxis_values.push(numberToDatetime(val[0]))
    })

    var compare_value = (values[values.length-1] - values[values.length-1-data.compare_lag]) /values[values.length-1] * 100

    var sub_text_color
    if (compare_value < 0) {
      sub_text_color = 'yellow'   
    } else {
      sub_text_color = 'green'  
    }
    option = {
        title: [
           {
                z:5,
                text: values[values.length-1],
                subtext: compare_value.toFixed(2) + '%'+ data.compare_suffix,
                left:'center',
                top:'50%',
                textStyle:{
                    fontSize:40,
                    align:'center',
          
                },
                subtextStyle:{
                    fontSize:20,
                    align:'center',
                    color:sub_text_color,
                }
                
        }],
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values,
                show : false,
            }
        ],
        yAxis : [
            {
                type : 'value',
                show : false,
            }
        ],
        series : {
            type:'line',
            data: values
        }
    }

    return option
}



//地图

function china_map(data) {

    var option = {}
    var values = []
    var max_value = data[0].metric
    data.forEach(function(val,index, arr){
       values.push({
            'value':val.metric,
            'name': val.country_id
       })
       if (max_value < val.metric) {
           max_value = val.metric
       }
    })

    option = {
        tooltip : {
            trigger: 'item',
        },

        visualMap: {
            min: 0,
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高','低'],           // 文本，默认为数值文本
            calculable: true
        },

        series: [
            {
                type: 'map',
                zoom: 1,
                label: {
                    emphasis: {
                        show: false
                    }
                },
                roam: true,   //可以放缩
                mapType: 'china',
                data: values
            }]
        
    }
    return option
}


//数字转日期
function numberToDatetime(date){
    var tmp_datetime = new Date()
    tmp_datetime.setTime(Number(date)/1000 * 1000)
    return tmp_datetime.toLocaleDateString()
}