#!/usr/bin/env node
// Reuse the pinned, GPL-3.0 upstream query implementation without modifying it.
import readline from 'node:readline';
import {upstreamMcp,createRuntime} from './lib/mcp-runtime.mjs';
const {handleJsonRpcRequest}=upstreamMcp;
let runtime;
const input=readline.createInterface({input:process.stdin,terminal:false});
for await(const line of input){
 if(!line.trim())continue;
 let response;
 try{const message=JSON.parse(line);runtime??=createRuntime();response=handleJsonRpcRequest(runtime,message);}
 catch(error){response={jsonrpc:'2.0',id:null,error:{code:-32700,message:String(error.message)}};}
 if(response)process.stdout.write(JSON.stringify(response).replaceAll('https://deanchen.me/jiangshan-map/','https://witlu.com/')+'\n');
}
