var color = require("rgb")
var mqtt = require("mqtt")

var client  = mqtt.connect()
var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-rgb-mqtt", "RGBMQTTAccessory", RGBMQTTAccessory);
};

function RGBMQTTAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.topic = config["topic"];
    this.mqttUrl = config["mqttUrl"];
    this.hsl = {h: 0, s: 0, l: 100};
    this.currentRed = '255';
	this.currentGreen = '255';
	this.currentBlue = '255';
    
	this.publish_options = {
		qos: ((config["qos"] !== undefined) ? config["qos"] : 0)
	};

	this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.options = {
		keepalive: 10,
		clientId: this.client_Id,
		protocolId: 'MQTT',
		protocolVersion: 4,
		clean: true,
		reconnectPeriod: 1000,
		connectTimeout: 30 * 1000,
		will: {
			topic: 'WillMsg',
			payload: 'Connection Closed abnormally..!',
			qos: 0,
			retain: false
		},
		username: config["username"],
		password: config["password"],
		rejectUnauthorized: false
	};

	this.client = mqtt.connect(this.mqttUrl, this.options);
	var that = this;
	this.client.on('error', function() {
		that.log('Error event on MQTT');
	});

	this.client.on('connect', function() {
		if (config["startCmd"] !== undefined && config["startParameter"] !== undefined) {
			that.client.publish(config["startCmd"], config["startParameter"]);
		}
	});
}

function powerOff(deviceId, topic) {
    client.publish(topic, 'r0,0,0')
}

function send(encodedData, topic){
 
    	client.publish(topic, 'e0');
		client.publish(topic, 'r' + encodedData.red + ',' + encodedData.green + ',' + encodedData.blue);
		console.log(encodedData);
}

function hslToRgb(hsl) {

    var javob = HSBtoRGB2(hsl.h,hsl.s,hsl.l);
    return {red: parseInt(javob[0]), green: parseInt(javob[1]), blue: parseInt(javob[2])};
}

function HSBtoRGB2(h, s, v) {
  var round = Math.round
  var s = s / 100, v = v / 100
  var c = v * s
  var hh = h / 60
  var x = c * (1 - Math.abs(hh % 2 - 1))
  var m = v - c

  var p = parseInt(hh, 10)
  var rgb = (
    p === 0 ? [c, x, 0] :
    p === 1 ? [x, c, 0] :
    p === 2 ? [0, c, x] :
    p === 3 ? [0, x, c] :
    p === 4 ? [x, 0, c] :
    p === 5 ? [c, 0, x] :
    []
  )

  return [
    round(255 * (rgb[0] + m)),
    round(255 * (rgb[1] + m)),
    round(255 * (rgb[2] + m))
  ]
}

RGBMQTTAccessory.prototype = {
    setPowerState: function (state, callback) {

        var deviceId = this.deviceId;
        if(state == "1") {
            send(hslToRgb(this.hsl), this.topic);
        } else {

            powerOff(deviceId, this.topic);
        }
        callback();
    },
    setHue: function (level, callback) {

        this.log("Setting Hue to %s", level);
        this.hsl.h = Math.round(level);
        send(hslToRgb(this.hsl), this.topic)
        callback();
    },
    setSaturation: function (level, callback) {

        this.hsl.s = Math.round(level);
        this.log("Setting saturation to %s", level);
        send(hslToRgb(this.hsl), this.topic)
        callback();
    },
    setBrightness: function (level, callback) {

        this.hsl.l = Math.round(level);
		this.log("Setting brightness to %s", level);
        send(hslToRgb(this.hsl), this.topic)
        callback();
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback();
    },

    getServices: function () {
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "RGB Led Strip")
            .setCharacteristic(Characteristic.Model, "WS2812 RGB Led")
            .setCharacteristic(Characteristic.SerialNumber, "WS2812B");

            var lightbulbService = new Service.Lightbulb(this.name);

            lightbulbService
                .addCharacteristic(Characteristic.Hue)
                .on('set', this.setHue.bind(this));

            lightbulbService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setPowerState.bind(this));

            lightbulbService
                .addCharacteristic(Characteristic.Saturation)
                .on('set', this.setSaturation.bind(this));

            lightbulbService
                .addCharacteristic(new Characteristic.Brightness())
                .on('set', this.setBrightness.bind(this));

            return [informationService, lightbulbService];
           
    }
};
