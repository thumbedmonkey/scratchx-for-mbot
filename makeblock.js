(function(ext) {
	var poller = null;
	var device = null;
	var status = false;
	var _selectors = {};
	var _buffer = [];
	var _isParseStartIndex = 0;
	var _isParseStart = false;
	var ports = {
        Port1: 1,
        Port2: 2,
        Port3: 3,
        Port4: 4,
		M1:9,
		M2:10,
		'on board':7,
		'light sensor on board':8
    };
    var slots = {
		Slot1:1,
		Slot2:2
	};
	var switchStatus = {
		On:1,
		Off:0
	};
	var shutterStatus = {
		Press:0,
		Release:1,
		'Focus On':2,
		'Focus Off':3,
	};
	var tones = {"B0":31,"C1":33,"D1":37,"E1":41,"F1":44,"G1":49,"A1":55,"B1":62,
			"C2":65,"D2":73,"E2":82,"F2":87,"G2":98,"A2":110,"B2":123,
			"C3":131,"D3":147,"E3":165,"F3":175,"G3":196,"A3":220,"B3":247,
			"C4":262,"D4":294,"E4":330,"F4":349,"G4":392,"A4":440,"B4":494,
			"C5":523,"D5":587,"E5":659,"F5":698,"G5":784,"A5":880,"B5":988,
			"C6":1047,"D6":1175,"E6":1319,"F6":1397,"G6":1568,"A6":1760,"B6":1976,
			"C7":2093,"D7":2349,"E7":2637,"F7":2794,"G7":3136,"A7":3520,"B7":3951,
	"C8":4186,"D8":4699};
	var beats = {"Half":500,"Quater":250,"Eighth":125,"Whole":1000,"Double":2000,"Zero":0};
	
	function onParse(byte){
		position = 0
		value = 0	
		_buffer.push(byte);
		var len = _buffer.length;
		if(len>= 2){
			if (_buffer[len-1]==0x55 && _buffer[len-2]==0xff){
				_isParseStartIndex = len-2	
				_isParseStart = true;
			}
			if (_buffer[len-1]==0xa && _buffer[len-2]==0xd && _isParseStart == true){
				_isParseStart = false;

				var position = _isParseStartIndex+2;
				var extID = _buffer[position];
				position+=1;
				var type = _buffer[position];
				position+=1;
				var value = 0;
				// 1 byte 2 float 3 short 4 len+string 5 double

				if (type == 1){
					value = _buffer[position];
				}
				if (type == 2){
					value = readFloat(position);
					if(value<-255 || value>1023){
						value = 0;
					}
				}
				if (type == 3){
					value = readShort(position);
				}
				if (type == 4){
					value = readString(position);
				}
				if (type == 5){
					value = readDouble(position);
				}
				if(type<=5){
					_selectors["callback_"+extID](value);
				}
				_buffer = []
			}
		}
	}
	function readFloat(position){
		var buf = new ArrayBuffer(4);
		var intView = new Uint8Array(buf);
		var floatView = new Float32Array(buf);
		for(var i=0;i<4;i++){
			intView[i] = _buffer[position+i];
		}
		return floatView[0];
	}
	function readShort(position){
		var buf = new ArrayBuffer(2);
		var intView = new Uint8Array(buf);
		var shortView = new Int16Array(buf);
		for(var i=0;i<2;i++){
			intView[i] = _buffer[position+i];
		}
		return shortView[0];
	}
	function readString(position){
		var l = _buffer[position]
		position+=1
		s = ""
		for(var i=0;i<l;i++){
			s += self.buffer[position+i].charAt(0)
		}
		return s
	}
	function readDouble(position){
		var buf = new ArrayBuffer(8);
		var intView = new Uint8Array(buf);
		var doubleView = new Float64Array(buf);
		for(var i=0;i<8;i++){
			intView[i] = _buffer[position+i];
		}
		return doubleView[0];
	}
	function short2array(v){
		var buf = new ArrayBuffer(2);
		var intView = new Uint8Array(buf);
		var shortView = new Int16Array(buf);
		shortView[0] = v;
		return [intView[0],intView[1]];
	}
	function float2array(v){
		var buf = new ArrayBuffer(4);
		var intView = new Uint8Array(buf);
		var floatView = new Float32Array(buf);
		floatView[0] = v;
		return [intView[0],intView[1],intView[2],intView[3]];
	}
	function deviceOpened(dev) {
	    // if device fails to open, forget about it
	    if (dev == null) device = null;

	    // otherwise start polling
	   	poller = setInterval(function() { 
	   		if(device!=null){
	   			function callback(buffer){
	   				var buf = new Uint8Array(buffer);
	   				var len = buf[0];
   					if(buf[0]>0){
   						for(var i=0;i<len;i++){
   							onParse(buf[i+1]);
   						}
   					}
	   			}
	   			device.read(callback,30);
	   		}
	   	}, 20);
	};
	ext._getStatus = function() {
        return status?{status: 2, msg: 'Ready'}:{status: 1, msg: 'Not Ready'};
    };
	ext._deviceConnected = function(dev) {
	    if(device) return;
	    console.log("_deviceConnected");
	    device = dev;
	    device.open(deviceOpened);
	    status = true;
	};
	ext._deviceRemoved = function(dev) {
	    if(device != dev) return;
	    if(poller) poller = clearInterval(poller);
	    device = null;
	    status = false;
	};
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    if(device) device.close();
	    device = null;
	    status = false;
	}
	var arrayBufferFromArray = function(data){
        var result = new Int8Array(data.length);
        for(var i=0;i<data.length;i++){
            result[i] = data[i];
        }
        return result;
    }

    //************* mBot Blocks ***************//
    function genNextID(port, slot){
		var nextID = (port << 4) | slot;
		return nextID;
	}
    ext.resetAll = function(){
    	var data = [0xff, 0x55, 0x02, 0x0, 0x04];
 		device.write(arrayBufferFromArray(data), function(){
 		})
    };
    ext.runBot = function(lSpeed,rSpeed){
		var deviceId = 5;
		var extId = 0;
		var data = [0xff, 0x55, 0x07, extId, 0x02, deviceId].concat(short2array(-lSpeed)).concat(short2array(rSpeed));
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 		});
    }
    ext.runMotor = function(port,speed){
    	if(typeof port=="string"){
			port = ports[port];
		}
		var deviceId = 10;
		var extId = 0;
		var data = [0xff, 0x55, 0x06, extId, 0x02, deviceId, port].concat(short2array(speed));
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 		});
    }
    ext.runServo = function(port,slot,angle){
    	if(typeof port=="string"){
			port = ports[port];
		}
		if(typeof slot=="string"){
			slot = slots[slot];
		}
		var deviceId = 11;
		var extId = 0;
		var data = [0xff, 0x55, 0x06, extId, 0x02, deviceId, port, slot, angle];
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 		});
    }
    ext.runLedOnBoard = function(index,red,green,blue){
		if(index == "all"){
			index = 0;
		}
		runLed(7,2,index,red,green,blue)
    }
    ext.runLed = function(port,slot,index,red,green,blue){
    	if(typeof port == "string"){
			port = ports[port];
		}
		if(typeof slot == "string"){
			slot = slots[slot];
		}
		if(port==ports["on board"]){
			slot = 2;
		}
		if(index == "all"){
			index = 0;
		}
		var deviceId = 8;
		var extId = 0;
		var data = [0xff, 0x55, 0x09, extId, 0x02, deviceId, port, slot, index, red*1, green*1, blue*1];
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 		});
    }
	ext.runBuzzer = function(tone,beat){
		if(typeof tone=="string"){
			tone = tones[tone];
		}
		if(typeof beat=="string"){
			beat = beats[beat];
		}
		var deviceId = 34;
		var extId = 0;
		var data = [0xff, 0x55, 0x05, extId, 0x02, deviceId].concat(short2array(tone)).concat(short2array(beat));
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 		});
	};
	ext.stopBuzzer = function(){
		runBuzzer(0,0);
	};
	ext.getLightSensor = function(port,callback){
		if(typeof port=="string"){
			port = ports[port];
		}
		var deviceId = 3;
		var extId = genNextID(port,0);
		console.log("port:",port,extId);
		var data = [0xff, 0x55, 0x04, extId, 0x01, deviceId, port];
		data = [data.length].concat(data);
 		device.write(arrayBufferFromArray(data), function(){
 			console.log("written");
 		});
		_selectors["callback_"+extId] = callback;
	}
	var descriptor = {
        blocks: [
        	[" ", "move left %d.motorvalue right %d.motorvalue","runBot", 100, 100],
			[" ", "set motor%d.motorPort speed %d.motorvalue","runMotor", "M1", 0],
			[" ", "set servo %d.port %d.slot angle %d.servovalue","runServo", "Port1","Slot1", 90],
			[" ", "set led %d.lport %d.slot %d.index red%d.value green%d.value blue%d.value","runLed","on board","Slot1","all",0,0,0],
			[" ", "play tone on note %d.note beat %d.beats","runBuzzer", "C4", "Half"],
			[" ", "stop tone","stopBuzzer"],
			[" ", "show face %d.port x:%n y:%n characters:%s","showCharacters", "Port1", 0,0,"Hello"],
			[" ", "show time %d.port hour:%n %m.points min:%n","showTime", "Port1", 10,":",20],
			[" ", "show drawing %d.port x:%n y:%n draw:%m.drawFace","showDraw", "Port1", 0,0,"        "],
			["-"],
			[" ", "set 7-segments display%d.port number %n","runSevseg", "Port1", 100],
			[" ", "set light sensor %d.aport led as %d.switch","runLightSensor", "Port3", "On"],
			[" ", "set camera shutter %d.port as %d.shutter","runShutter","Port1", "Press"],
			["-"],
			["R", "light sensor %d.laport","getLightSensor","light sensor on board"],
			["h", "when button %m.button_state","whenButtonPressed","pressed"],
			["B", "button %m.button_state","getButtonOnBoard","pressed"],
			["-"],
			["R", "ultrasonic sensor %d.port distance","getUltrasonic","Port1"],
			["R", "line follower %d.port","getLinefollower","Port1"],
			["R", "joystick %d.aport %d.Axis","getJoystick","Port3","X-Axis"],
			["R", "potentiometer %d.aport","getPotentiometer","Port3"],
			["R", "sound sensor %d.aport","getSoundSensor","Port3"],
			["B", "limit switch %d.port %d.slot","getLimitswitch","Port1","Slot1"],
			["R", "temperature %d.port %d.slot °C","getTemperature","Port3","Slot1"],
			["R", "pir motion sensor %d.port","getPirmotion","Port2"],
			["-"],
			["B","ir remote %m.ircode pressed","getIrRemote","A"],
			["-"],
			[" ", "send mBot's message %s","runIR", "hello"],
			["R", "mBot's message received","getIR"],
			["-"],
			["R", "timer","getTimer", "0"],	
			[" ", "reset timer","resetTimer", "0"]
			],
        menus: {
			motorPort:["M1","M2"],
			slot:["Slot1","Slot2"],
			index:["all",1,2],
			Axis:["X-Axis","Y-Axis"],
			port:["Port1","Port2","Port3","Port4"],
			aport:["Port3","Port4"],
			lport:["led on board","Port1","Port2","Port3","Port4"],
			laport:["light sensor on board","Port3","Port4"],
			direction:["run forward","run backward","turn right","turn left"],
			points:[":"," "],
			note:["C2","D2","E2","F2","G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","A6","B6","C7","D7","E7","F7","G7","A7","B7","C8","D8"],
			beats:["Half","Quater","Eighth","Whole","Double","Zero"],
			servovalue:[0,45,90,135,180],
			motorvalue:[-255,-100,-50,0,50,100,255],
			value:[0,20,60,150,255],
			button_state:["pressed","released"],
			shutter:["Press","Release","Focus On","Focus Off"],
			level:["Off","On"],
			ircode:["A","B","C","D","E","F","↑","↓","←","→","Setting","R0","R1","R2","R3","R4","R5","R6","R7","R8","R9"],
		}
    };
	var hid_info = {type: 'hid', vendor: 0x0416, product: 0xffff};
	ScratchExtensions.register('Makeblock mBot', descriptor, ext, hid_info);
})({});