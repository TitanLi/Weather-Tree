var koa = require('koa');
var Router = require('koa-router');
var logger = require('koa-logger');
var serve = require('koa-static');
var json = require('koa-json');
var bodyParser = require('koa-bodyparser');
var request = require('request');
var SerialPort = require("serialport");
var app = koa();
var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
var events = require('events');
var render = require('./lib/render.js');

var serialData,arduinoData=[0,0];
var red=255,green=255,blue=255,temp=26,ledControl=0;
var eventEmitter = new events.EventEmitter();
var router = new Router();

//連線設定
var port = new SerialPort("/dev/ttyACM0", {
    parser: SerialPort.parsers.readline('\n')
});

//Server每3秒執行一次
setInterval(function(){
  console.log(red+"#"+green+"#"+blue+"#"+temp+"#"+ledControl+"#");
  port.write(red+"#"+green+"#"+blue+"#"+temp+"#"+ledControl+"#" , function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
  });
}, 3000);

//連接到arduino
port.on('open', function() {
  console.log('arduino connection');
    port.on('data', function(data) {
        console.log("收到的資料"+data);
        serialData=data.split("#");
        arduinoData[0]=parseInt(serialData[0]);
        arduinoData[1]=parseInt(serialData[1]);
        eventEmitter.emit('update',arduinoData);
    });
});

// open errors will be emitted as an error event
port.on('error', function(err) {
    console.log('Error: ', err.message);
});

//socket連線
io.sockets.on('connection',function(client){
    var socketClient = client;
    eventEmitter.on('update',function(){
      //發送資料
      socketClient.emit('event',arduinoData);
      console.log(arduinoData);
    });
    console.log('socket.io connection');
});

//網頁koa框架
app.use(json());
app.use(logger());
app.use(bodyParser());
app.use(serve(__dirname+'/lib'));

//url路徑
router.get('/',index);
router.post('/color',color);
router.post('/control',control);

function * index(){
  var data ;
  yield function(done){
    //116.json為台中市北區天氣，半小時更新一次
    request('https://works.ioa.tw/weather/api/weathers/116.json', function (error, response, body) {
      data = JSON.parse(body);
      temp = data.temperature;
      done();
    });
  }

  this.body = yield render('index',{desc:data.desc,
                                    temperature:data.temperature,
                                    felt_air_temp:data.felt_air_temp,
                                    humidity:data.humidity,
                                    specials:data.specials.length>0?data.specials[0]:"...",
                                    arduinoTem:arduinoData[0],
                                    arduinoHum:arduinoData[1],
                                    red:parseInt(red,10),
                                    green:parseInt(green,10),
                                    blue:parseInt(blue,10),
                                    ledControl:ledControl
                                  });
}

function * color(){
    red = num(parseInt(this.request.body.R));
    green = num(parseInt(this.request.body.G));
    blue = num(parseInt(this.request.body.B));
    this.body="ok"
};

function * control(){
    ledControl = (ledControl + 1)%2;
    this.body = ledControl;
}

function num(color){
  if(color>=100){
    return ""+color;
  }else if(color>=10){
    return "0"+color;
  }else{
    return "00"+color;
  }
}

app.use(router.middleware());
server.listen(3000,function(){
  console.log('listening on port 3000');
});
