

exports.segments = {
    'MSH': [],
    'EVN': ['', 'TS', 'TS', 'IS', 'CN', 'TS', 'HD'],
    'OBX': [],
    'PID': ['', '', 'CX', 'CX', 'XPN', '', 'TS', '', 'XAD', '', 'XTN', '', '', '', 'CX'],
    'NK1': ['', 'XPN', 'CE', 'XAD', 'XTN', 'XTN', 'CE'],
    'PR1': [],
    'PV1': ['', '', 'PL', '', '', '', 'XCN', 'XCN', '', '', 'XCN', '', 'CX', 'FC', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'TS'],
    'IN1': ['', 'CE', '', '', '', 'XPN', 'CE'],
    'MSA': [],
    'SFT': [],
    'ERR': []
};

exports.message = {
    'ACK': {
        'MSH': exports.segments.MSH,
        'SFT': exports.segments.SFT,
        'MSA': exports.segments.MSA,
        'ERR': exports.segments.ERR
    },
    'ADT^A04': {
        'MSH': exports.segments.MSH,
        'EVN': exports.segments.EVN,
        'PID': exports.segments.PID,
        'NK1': exports.segments.NK1,
        'PR1': exports.segments.PR1,
        'PV1': exports.segments.PV1,
        'IN1': exports.segments.IN1
    }
};

exports.fields = {
    
};
