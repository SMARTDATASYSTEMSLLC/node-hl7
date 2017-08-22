/*
* HL7 Parser
* Copyright (c) 2012 Eric Kryski
* MIT Licensed
*/

// KNOWN ISSUES: 1) I pull the delimiters from MSH but don't use them
//               2) repetitions aren't enabled (another loop needed within the k loop)
//               3) I hacked the MSH segment to actually work like a real segment
"use strict";
const builder = require('xmlbuilder');
const xml2js = require('xml2js');

const delimiters = {
    composite: '', // |
    subComposite: '', // ^
    repetitions: '', // ~
    escapeChar: '', // \
    subSubComposite: '' // &
};

function buildSegment(xml, composites){
   //console.log('COMPOSITES', composites);

  const compositeParent = xml.ele(composites[0]);

  for (let j=1; j < composites.length; j++) {
      let subCompositeParent, repetitions;

      if (composites[0] === 'MSH'){
          repetitions = [composites[j]];
      }else {
          repetitions = composites[j].split(delimiters.repetitions);
      }

      //console.log('REPETITION NODES', repetitions);

      for (let r=0; r < repetitions.length; r++){
          subCompositeParent = compositeParent.ele(composites[0] + '.' + j);
          let textNodes;

          if (composites[0] === 'MSH' && j === 2){
              textNodes = [repetitions[r]];
          }else {
              textNodes = repetitions[r].split(delimiters.subComposite);
          }

          //console.log('TEXT NODES', textNodes);

          for (let k=1; k <= textNodes.length; k++) {
            const node = subCompositeParent.ele(composites[0] + '.' + j + '.' + k);


            if (textNodes[k-1]) {
              node.txt(textNodes[k-1]);
            }
          }
      }
  }

  return xml;
}

exports.toXml = function(msg, callback) {
    let xmlString;
    try {
        msg = msg.trim();
        if (msg.slice(-2) === String.fromCharCode(0x1c, 0x0d)) {
            msg = msg.slice(0, -2);
        }
        msg = msg.substr(msg.indexOf("MSH"));

        delimiters.composite = msg.substring(3, 4); // |
        delimiters.subComposite = msg.substring(4, 5); // ^
        delimiters.repetitions = msg.substring(5, 6); // ~
        delimiters.escapeChar = msg.substring(6, 7); // \
        delimiters.subSubComposite = msg.substring(7, 8); // &

        const segments = msg.split(/\r/);

        const headerComposites = segments[0].split(delimiters.composite);
        const head = headerComposites.shift();
        headerComposites.unshift(head, '|');

        let adt = ((headerComposites || [])[9] || "").split('^')[0];

        if (!adt){
            callback({message: 'Unable to Parse', error: 'Missing MSH.9.1', record: msg} , null);
        }
        let xml = builder.create(headerComposites[9].split('^')[0], {
            'version': '1.0',
            'encoding': 'UTF-8'
        }).att('xmlns', 'urn:hl7-org:v2xml');

        xml = buildSegment(xml, headerComposites);

        for (let i = 1; i < segments.length; i++) {
            if (segments[i] && !segments[i].match(/^(\s*|.)$/)) {
                const composites = segments[i].split(delimiters.composite);

                xml = buildSegment(xml, composites);
            }
        }

        xmlString = xml.end({'pretty': true, 'indent': '    ', 'newline': '\n'});
    }catch(err){
        callback({message: 'Malformed hl7', error: err, record: msg} , null);
        return;
    }
   //console.log(xmlString);
  callback(null, xmlString);
};

exports.toJson = function (packet, callback){
    const parser = new xml2js.Parser();

    // It is XML format
    if (packet.indexOf('<?xml') === -1) {
        this.toXml(packet, function (error, xml) {
            if (error) {callback(error, null);}
            parser.parseString(xml, callback);
        });
    } else {
        parser.parseString(packet.trim(), callback);
    }

};
