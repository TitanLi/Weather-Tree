var koa = require('koa');
var Router = require('koa-router');
var logger = require('koa-logger');
var serve = require('koa-static');
var json = require('koa-json');
var bodyParser = require('koa-bodyparser');
var request = require('request');
var render = require('./lib/render.js');

var arduinoData=[0,0];
var app = koa();
var router = new Router();

app.use(json());
app.use(logger());
app.use(bodyParser());
app.use(serve(__dirname+'/lib'));

router.get('/',index);
router.post('/color',color);

function * index(){
  var data ;
  yield function(done){
    request('https://works.ioa.tw/weather/api/weathers/116.json', function (error, response, body) {
      data = JSON.parse(body);
      done();
    });
  }
  console.log(data);
  // data = JSON.parse(data);
  console.log(data.specials.length>0?data.specials[0]:"...");
  this.body = yield render('index',{desc:data.desc,
                                    temperature:data.temperature,
                                    felt_air_temp:data.felt_air_temp,
                                    humidity:data.humidity,
                                    specials:data.specials.length>0?data.specials[0]:"...",
                                    arduinoTem:arduinoData[0],
                                    arduinoHum:arduinoData[1]
                                  });
}

function * color(){
    var red = this.request.body.R;
    var green = this.request.body.G;
    var blue = this.request.body.B;
    console.log(red,green,blue);
};

app.use(router.middleware());
app.listen(3000,function(){
  console.log('listening on port 3000');
});
