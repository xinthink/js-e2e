// import fs from 'fs';
let fs = require('fs');
let crypto = require('crypto');
let os = require('os');
let constants = require('constants');
let processModule = require('process');

const querystring = require('querystring');

const moduleA = require('./moduleA');
moduleA.testA();

fs.statSync('./');
var a = 10;
var obj;
let nestedProp = obj?.first?.second;

if (process.arch === "ia32" && process.platform === "win32") {
    console.log('不支持32位windows');
}

let url = require('url');
var urlLocal = new url.URL('http://localhost:12345');

console.log(__dirname);

function foo() {
    return a;
}
