"use strict";
/*
 * NodeJS HL7 Server
 * Copyright (c) 2012 Eric Kryski
 * MIT Licensed
 */

const net = require('net'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    hl7 = require('./parser.js'),
    xml2js = require('xml2js');

/*
 * Supported HL7 protocol version
 */

exports.protocol = '2.6';


/**
 * Creates a HL7 Server
 *
 * @param host Server Host
 * @param port Port to listen on
 * @param {Object} options
 * @api public
 */

function Server(host, port, options) {
    const self = this;

    // Needed to convert this constructor into EventEmitter
    EventEmitter.call(this);

    options = options || {};
    this.host = host || '127.0.0.1';
    this.port = port || 59895;
    this.debug = options.debug || false;
    this.json = options.json || true;

    const parser = new xml2js.Parser();
    let responseMessageNumber = 0;
    let message = "";

    // TODO: Build up proper ACKS
    const applicationErrorACK = String.fromCharCode(0x0b) + 'MSH|^~\\&|MediDoc|MedidocError|TESTSYSTEM|TESTFACILITY|20121217158325.194-0700||ACK^RO1|101|T|2.6\nMSA|AE|17' + String.fromCharCode(0x0d, 0x1c, 0x0d);

    // Bind to TCP socket for HL7
    this.socket = net.createServer({ allowHalfOpen: false}, function(socket){

        socket.setEncoding("utf8");

        function handleError(error){
            socket.write(applicationErrorACK);

            self.emit('error', error);
            //console.error("HL7 TCP Server ERROR: ", error);
        }

        function createEL7AckForMessageNumber(messageNumber) {
            return String.fromCharCode(0x0b) + 'MSH|^~\\&|MediDoc||HSTPathways||' + generateTimeStamp() + '|1100|ACK^RO1|' + messageNumber + '|P|2.3\rMSA|AA|' + messageNumber + '|MSG Received Successfully' + String.fromCharCode(0x0d, 0x1c, 0x0d);
        }

        function zeroFill( number, width ) {
            width -= number.toString().length;
            if ( width > 0 ) {
                return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
            }
            return number + ""; // always return a string
        }

        function generateTimeStamp() {
            const now = new Date();

            const month = zeroFill(now.getUTCMonth() + 1, 2);
            const date = zeroFill(now.getUTCDate(), 2);
            const hours = zeroFill(now.getUTCHours(), 2);
            const minutes = zeroFill(now.getUTCMinutes(), 2);
            const seconds = zeroFill(now.getUTCSeconds(), 2);

            return `${now.getUTCFullYear()
                .toString()}${month}${date}${hours}${minutes}${seconds}.${now.getUTCMilliseconds().toString()}+0000`;
        }

        function getUniqueMessageNumber() {
            return ++responseMessageNumber;
        }

        function createXMLAckForMessageNumber(messageNumber) {
            const ack = String.fromCharCode(0x0b) + '<?xml version="1.0" encoding="UTF-8"?>' +
                '\n<ACK xmlns="urn:hl7-org:v2xml">' +
                '\n<MSH>' +
                '\n<MSH.1>|</MSH.1>' +
                '\n<MSH.2>^~\&amp;</MSH.2>' +
                '\n<MSH.7>' + generateTimeStamp() + '</MSH.7>' +
                '\n<MSH.9>' +
                '\n<MSG.1>ACK</MSG.1>' +
                '\n<MSG.2>R01</MSG.2>' +
                '\n</MSH.9>' +
                '\n<MSH.10>' + getUniqueMessageNumber() + '</MSH.10>' +
                '\n<MSH.11>' +
                '\n<PT.1>T</PT.1>' +
                '\n</MSH.11>' +
                '\n<MSH.12>' +
                '\n<VID.1>2.6</VID.1>' +
                '\n</MSH.12>' +
                '\n</MSH>' +
                '\n<MSA>' +
                '\n<MSA.1>AA</MSA.1>' +
                '\n<MSA.2>' + messageNumber + '</MSA.2>' +
                '\n</MSA>' +
                '\n</ACK>\n' + String.fromCharCode(0x1c) + '\r';
            console.log("Generated ACK: " + ack);
            return ack;
        }

        function handleXML(xml, sendEL7Ack, packet){
            parser.parseString(xml, function(error, result){
                if (error) {return handleError(error);}

                if (self.debug) {
                    console.log("Message: ", util.inspect(result, false, 7, true));
                    console.log('Sending ACK');
                }
                self.emit('hl7', result, packet);

                //console.log(result.ADT_A08);

                let messageNumber = 0;

                for (let key in result) {
                    if (result.hasOwnProperty(key)) {
                        if (result[key].MSH) {
                            let msg = result[key].MSH[0]["MSH.10"][0];
                            if (typeof msg !== "string"){
                                msg = msg['MSH.10.1'][0];
                            }
                            messageNumber = msg;
                        }
                    }
                }

                console.log("Sending ACK for messageNumber "+messageNumber);

                if (sendEL7Ack) {
                    let ack = createEL7AckForMessageNumber(messageNumber);
                    socket.write(ack);
                }
                else {
                    let ack = createXMLAckForMessageNumber(messageNumber);
                    socket.write(new Buffer(ack, "utf8"));
                }
                //socket.end();
            });
        }

        socket.on('connect', function() {
            if (self.debug) {
                const now = new Date();
                console.log(now + " - HL7 TCP Client Connected");
            }
        });

        socket.on('data', function(packet) {
            //if (self.debug) {
                //console.trace(packet);
            //}

            if (!packet) {return handleError(new Error('Packet is empty'));}

            message += packet.toString();

            if (message.substring(message.length - 2, message.length) == String.fromCharCode(0x1c, 0x0d)) {

                // It is HL7 format
                if (message.indexOf('<?xml') === -1) {
                    message = message.split(String.fromCharCode(0x1c, 0x0d, 0x0b));

                    message.forEach(p => hl7.toXml(p, function (error, xml) {
                        if (error) {return handleError(error);}
                        handleXML(xml, true, p);
                    }));
                } else {
                    handleXML(message.trim(), false, message.trim());
                }

                message = "";
            }
        });

        socket.on('error', function(error){
            handleError(error);
        });

        socket.on('close', function(){
            if (self.debug) {
                const now = new Date();
                console.log(now + " - HL7 TCP Server Disconnected");
            }

            self.emit('close');
        });

        socket.on('end', function() {
            if (self.debug) {
                const now = new Date();
                console.log(now + " - HL7 TCP Client Disconnected");
            }

            self.emit('end');
        });
    });

    this.socket.listen( this.port, () => {
        const address = this.socket.address();
        console.log("HL7 TCP Server listening on: " + address.address + ":" + address.port);
    });
}

// Needed to convert this constructor into EventEmitter
util.inherits(Server, EventEmitter);

/**
 * Expose HL7 Server constructor
 */
exports = module.exports = Server;
