const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json({ limit: "50mb" }));

// ================= DATA =================

const users = new Map();
const globalMessages = [];
const onlineUsers = new Map();

// ================= HTML =================

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Rucord X</title>

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:Inter,sans-serif;
}

body{
background:#0f1117;
color:white;
height:100vh;
overflow:hidden;
}

/* LOGIN */

#login{
position:fixed;
inset:0;
background:
radial-gradient(circle at top left,#5865f2 0%,transparent 30%),
radial-gradient(circle at bottom right,#8f3dff 0%,transparent 30%),
#0f1117;
display:flex;
align-items:center;
justify-content:center;
z-index:100;
}

.login-box{
width:380px;
background:rgba(20,22,30,.92);
border:1px solid rgba(255,255,255,.08);
backdrop-filter:blur(20px);
padding:40px;
border-radius:28px;
box-shadow:0 0 60px rgba(88,101,242,.25);
animation:show .4s ease;
}

@keyframes show{
from{
opacity:0;
transform:translateY(20px) scale(.95);
}
to{
opacity:1;
transform:none;
}
}

.logo{
font-size:42px;
font-weight:800;
margin-bottom:10px;
text-align:center;
background:linear-gradient(90deg,#fff,#8ea1ff);
-webkit-background-clip:text;
-webkit-text-fill-color:transparent;
}

.sub{
text-align:center;
color:#8f96a3;
margin-bottom:30px;
}

.input{
width:100%;
padding:16px;
border:none;
outline:none;
background:#161922;
color:white;
border-radius:16px;
margin-bottom:14px;
font-size:15px;
border:1px solid transparent;
transition:.2s;
}

.input:focus{
border-color:#5865f2;
box-shadow:0 0 0 4px rgba(88,101,242,.15);
}

.btn{
width:100%;
padding:15px;
border:none;
border-radius:16px;
font-weight:700;
cursor:pointer;
transition:.2s;
font-size:15px;
}

.login-btn{
background:#5865f2;
color:white;
margin-top:5px;
}

.login-btn:hover{
transform:translateY(-2px);
background:#6d78ff;
}

.register-btn{
margin-top:10px;
background:#232734;
color:#cfd3dc;
}

.register-btn:hover{
background:#2b3040;
}

/* APP */

#app{
display:none;
height:100vh;
}

/* SIDEBAR */

.sidebar{
width:300px;
background:#12141c;
border-right:1px solid rgba(255,255,255,.05);
display:flex;
flex-direction:column;
}

.sidebar-top{
padding:24px;
border-bottom:1px solid rgba(255,255,255,.05);
}

.brand{
font-size:28px;
font-weight:800;
}

.online{
margin-top:8px;
color:#7d8594;
font-size:14px;
}

.channels{
padding:15px;
overflow:auto;
}

.channel{
padding:16px;
background:#181b24;
border-radius:18px;
margin-bottom:10px;
cursor:pointer;
transition:.2s;
font-weight:600;
}

.channel:hover{
background:#202432;
transform:translateX(4px);
}

.channel.active{
background:linear-gradient(90deg,#5865f2,#7b61ff);
}

/* CHAT */

.chat{
flex:1;
display:flex;
flex-direction:column;
background:#0f1117;
}

.chat-top{
height:85px;
border-bottom:1px solid rgba(255,255,255,.05);
display:flex;
align-items:center;
justify-content:space-between;
padding:0 30px;
background:rgba(255,255,255,.02);
backdrop-filter:blur(10px);
}

.chat-title{
font-size:24px;
font-weight:700;
}

.actions{
display:flex;
gap:10px;
}

.action{
background:#1c202c;
border:none;
color:white;
padding:12px 18px;
border-radius:14px;
cursor:pointer;
transition:.2s;
font-weight:600;
}

.action:hover{
background:#5865f2;
transform:translateY(-2px);
}

/* MESSAGES */

.messages{
flex:1;
overflow:auto;
padding:30px;
display:flex;
flex-direction:column;
gap:18px;
}

.message{
display:flex;
gap:14px;
align-items:flex-start;
animation:fade .2s ease;
}

@keyframes fade{
from{
opacity:0;
transform:translateY(10px);
}
to{
opacity:1;
transform:none;
}
}

.avatar{
width:48px;
height:48px;
border-radius:50%;
background:linear-gradient(135deg,#5865f2,#8f3dff);
display:flex;
align-items:center;
justify-content:center;
font-weight:800;
font-size:18px;
flex-shrink:0;
}

.bubble{
background:#181b24;
padding:16px;
border-radius:20px;
max-width:700px;
box-shadow:0 4px 20px rgba(0,0,0,.25);
}

.name{
font-weight:700;
margin-bottom:8px;
color:#aab2ff;
}

.text{
line-height:1.5;
font-size:15px;
}

/* INPUT */

.input-bar{
padding:24px;
border-top:1px solid rgba(255,255,255,.05);
display:flex;
gap:16px;
background:#12141c;
}

.msg-input{
flex:1;
background:#1a1d27;
border:none;
outline:none;
padding:18px;
border-radius:20px;
color:white;
font-size:15px;
}

.send{
width:70px;
border:none;
border-radius:20px;
background:linear-gradient(135deg,#5865f2,#7b61ff);
color:white;
font-size:18px;
cursor:pointer;
font-weight:800;
transition:.2s;
}

.send:hover{
transform:scale(1.05);
}

/* MOBILE */

@media(max-width:800px){

.sidebar{
display:none;
}

.chat-top{
padding:0 16px;
}

.chat-title{
font-size:18px;
}

.messages{
padding:16px;
}

.input-bar{
padding:16px;
}

}

</style>
</head>

<body>

<!-- LOGIN -->

<div id="login">

<div class="login-box">

<div class="logo">Rucord X</div>
<div class="sub">Новый уровень общения</div>

<input id="username" class="input" placeholder="Имя">
<input id="password" class="input" type="password" placeholder="Пароль">

<button id="loginBtn" class="btn login-btn">
Войти
</button>

<button id="registerBtn" class="btn register-btn">
Создать аккаунт
</button>

</div>

</div>

<!-- APP -->

<div id="app">

<div class="sidebar">

<div class="sidebar-top">
<div class="brand">Rucord</div>
<div class="online" id="onlineCount">
Онлайн: 0
</div>
</div>

<div class="channels">
<div class="channel active">
# общий-чат
</div>

<div class="channel">
🎮 игры
</div>

<div class="channel">
🤖 ai
</div>
</div>

</div>

<div class="chat">

<div class="chat-top">

<div class="chat-title">
# общий-чат
</div>

<div class="actions">
<button class="action">🎮</button>
<button class="action">📞</button>
<button class="action">🤖</button>
</div>

</div>

<div class="messages" id="messages"></div>

<div class="input-bar">

<input
id="messageInput"
class="msg-input"
placeholder="Написать сообщение..."
>

<button id="sendBtn" class="send">
➤
</button>

</div>

</div>

</div>

<script src="/socket.io/socket.io.js"></script>

<script>

const socket = io();

let currentUser = "";

// ===== LOGIN =====

async function login(type){

const username =
document.getElementById("username").value.trim();

const password =
document.getElementById("password").value.trim();

if(!username || !password){
alert("Заполни поля");
return;
}

const res = await fetch("/" + type,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
username,
password
})
});

const data = await res.json();

if(!data.success){
alert(data.message);
return;
}

currentUser = username;

document.getElementById("login").style.display = "none";
document.getElementById("app").style.display = "flex";

socket.emit("join",username);

loadMessages();

}

document.getElementById("loginBtn")
.onclick = () => login("login");

document.getElementById("registerBtn")
.onclick = () => login("register");

// ===== MESSAGES =====

function addMessage(msg){

const messages =
document.getElementById("messages");

const div = document.createElement("div");

div.className = "message";

div.innerHTML = \`
<div class="avatar">
\${msg.user[0].toUpperCase()}
</div>

<div class="bubble">
<div class="name">
\${escapeHtml(msg.user)}
</div>

<div class="text">
\${escapeHtml(msg.text)}
</div>
</div>
\`;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

function escapeHtml(text){

return text
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;");

}

async function loadMessages(){

const res = await fetch("/messages");
const data = await res.json();

document.getElementById("messages").innerHTML = "";

data.forEach(addMessage);

}

function sendMessage(){

const input =
document.getElementById("messageInput");

const text = input.value.trim();

if(!text) return;

socket.emit("message",{
user:currentUser,
text
});

input.value = "";

}

document.getElementById("sendBtn")
.onclick = sendMessage;

document.getElementById("messageInput")
.addEventListener("keypress",e=>{

if(e.key === "Enter"){
sendMessage();
}

});

// ===== SOCKET =====

socket.on("message",msg=>{
addMessage(msg);
});

socket.on("online",count=>{
document.getElementById("onlineCount")
.innerText = "Онлайн: " + count;
});

</script>

</body>
</html>
`);
});

// ================= API =================

app.post("/register",(req,res)=>{

const { username,password } = req.body;

if(users.has(username)){

return res.json({
success:false,
message:"Аккаунт уже существует"
});

}

users.set(username,{
password
});

res.json({
success:true
});

});

app.post("/login",(req,res)=>{

const { username,password } = req.body;

const user = users.get(username);

if(!user || user.password !== password){

return res.json({
success:false,
message:"Неверный логин"
});

}

res.json({
success:true
});

});

app.get("/messages",(req,res)=>{
res.json(globalMessages);
});

// ================= SOCKET =================

io.on("connection",(socket)=>{

socket.on("join",(username)=>{

onlineUsers.set(socket.id,username);

io.emit("online",onlineUsers.size);

});

socket.on("message",(msg)=>{

const message = {
user:msg.user,
text:msg.text
};

globalMessages.push(message);

if(globalMessages.length > 100){
globalMessages.shift();
}

io.emit("message",message);

});

socket.on("disconnect",()=>{

onlineUsers.delete(socket.id);

io.emit("online",onlineUsers.size);

});

});

// ================= START =================

const PORT = process.env.PORT || 3000;

server.listen(PORT,()=>{

console.log("SERVER STARTED " + PORT);

});
