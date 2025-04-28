
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

const app=express();
const srv=http.createServer(app);
const io=new Server(srv,{cors:{origin:"*"}});

function makeWorld(){
  const shapes=[];
  for(let i=0;i<60;i++){
    shapes.push({id:uuid(),type:["square","triangle","pentagon"][i%3],
      x:200+Math.random()*900,y:200+Math.random()*500,size:20});
  }
  return {players:{},bullets:[],shapes,mobs:[]};
}
const world=makeWorld();
function spawn(id){
  world.players[id]={id,x:640,y:360,turret:0,input:{},q:[]};
  return world.players[id];
}
io.on("connection",sock=>{
  const p=spawn(sock.id);
  sock.emit("init",{world,selfId:sock.id});
  sock.on("input",inp=>p.input=inp);
  sock.on("shoot",ang=>p.q.push(ang));
  sock.on("respawn",()=>{p.x=640;p.y=360;});
  sock.on("disconnect",()=>delete world.players[sock.id]);
});
function step(dt){
  for(const p of Object.values(world.players)){
    p.x+=((p.input.d?1:0)-(p.input.a?1:0))*120*dt;
    p.y+=((p.input.s?1:0)-(p.input.w?1:0))*120*dt;
    p.turret=p.input.mouseA||p.turret;
    while(p.q.length){
      const ang=p.q.shift();
      world.bullets.push({id:uuid(),x:p.x,y:p.y,ang,v:320});
    }
  }
  for(const b of world.bullets){
    b.x+=Math.cos(b.ang)*b.v*dt;
    b.y+=Math.sin(b.ang)*b.v*dt;
  }
  world.bullets=world.bullets.filter(b=>b.x>-50&&b.x<1330&&b.y>-50&&b.y<770);
}
setInterval(()=>{step(0.05);io.emit("snapshot",world);},50);

app.use("/",express.static("public"));
const PORT=process.env.PORT||3000;
srv.listen(PORT,()=>console.log("Server @",PORT));
