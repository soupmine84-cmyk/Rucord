const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
cors:{ origin:"*" }
});

app.use(express.json({ limit:"50mb" }));

// ================= DATA =================

const users = new Map();
const globalMessages = [];
const onlineUsers = new Map();
const friends = new Map();

const profiles = new Map();

profiles.set("AdminGrigory",{
bio:"Основатель Rucord",
verified:true,
official:true
});

profiles.set("SUIDKOP",{
bio:"Официальный аккаунт",
verified:true,
official:true
});

// ================= HTML =================

app.get("/",(req,res)=>{

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
}

.btn{
width:100%;
padding:15px;
border:none;
border-radius:16px;
font-weight:700;
cursor:pointer;
font-size:15px;
}

.login-btn{
background:#5865f2;
color:white;
margin-top:5px;
}

.register-btn{
margin-top:10px;
background:#232734;
color:#cfd3dc;
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
}

.message.me{
flex-direction:row-reverse;
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

.message.me .avatar{
background:linear-gradient(135deg,#ff4fd8,#ff7b7b);
}

.bubble{
background:#181b24;
padding:16px;
border-radius:20px;
max-width:700px;
}

.message.me .bubble{
background:linear-gradient(135deg,#5865f2,#7b61ff);
}

.name{
font-weight:700;
margin-bottom:8px;
color:#aab2ff;
cursor:pointer;
}

.message.me .name{
color:white;
text-align:right;
}

.text{
line-height:1.5;
font-size:15px;
}

.message.me .text{
text-align:right;
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
}

/* PROFILE */

#profileModal{
display:none;
position:fixed;
inset:0;
background:rgba(0,0,0,.6);
align-items:center;
justify-content:center;
z-index:999;
}

.profile-card{
width:340px;
background:#181b24;
border-radius:28px;
padding:30px;
}

.profile-avatar{
width:90px;
height:90px;
border-radius:50%;
background:linear-gradient(135deg,#5865f2,#8f3dff);
display:flex;
align-items:center;
justify-content:center;
font-size:36px;
font-weight:800;
margin:auto;
}

.profile-name{
margin-top:18px;
text-align:center;
font-size:28px;
font-weight:800;
}

.profile-badge{
text-align:center;
margin-top:8px;
font-size:14px;
}

.profile-bio{
margin-top:20px;
text-align:center;
color:#9aa3b2;
line-height:1.5;
}

/* MOBILE */

@media(max-width:800px){

.sidebar{
display:none;
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

<div class="sub">
Новый уровень общения
</div>

<input
id="username"
class="input"
placeholder="Имя"
>

<input
id="password"
class="input"
type="password"
placeholder="Пароль"
>

<button
id="loginBtn"
class="btn login-btn"
>
Войти
</button>

<button
id="registerBtn"
class="btn register-btn"
>
Создать аккаунт
</button>

</div>

</div>

<!-- APP -->

<div id="app">

<div class="sidebar">

<div class="sidebar-top">

<div class="brand">
Rucord
</div>

<div
class="online"
id="onlineCount"
>
Онлайн: 0
</div>

</div>

<div class="channels">

<div class="channel active">
# общий-чат
</div>

<div class="channel">
👥 друзья
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

</div>

<div
class="messages"
id="messages"
></div>

<div class="input-bar">

<input
id="messageInput"
class="msg-input"
placeholder="Написать сообщение..."
>

<button
id="sendBtn"
class="send"
>
➤
</button>

</div>

</div>

</div>

<!-- PROFILE -->

<div id="profileModal">

<div class="profile-card">

<div
class="profile-avatar"
id="profileAvatar"
>
A
</div>

<div
class="profile-name"
id="profileName"
>
USER
</div>

<div
class="profile-badge"
id="profileBadge"
>
</div>

<div
class="profile-bio"
id="profileBio"
>
Описание
</div>

<textarea
id="bioInput"
class="input"
placeholder="Новое описание"
style="margin-top:20px;height:100px;"
></textarea>

<button
class="btn login-btn"
onclick="saveBio()"
>
Сохранить
</button>

<button
class="btn register-btn"
onclick="closeProfile()"
>
Закрыть
</button>

</div>

</div>

<script src="/socket.io/socket.io.js"></script>

<script>

const socket = io();

let currentUser = "";
let openedProfile = "";

// ================= LOGIN =================

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

document.getElementById("login")
.style.display = "none";

document.getElementById("app")
.style.display = "flex";

socket.emit("join",username);

loadMessages();

}

document.getElementById("loginBtn")
.onclick = () => login("login");

document.getElementById("registerBtn")
.onclick = () => login("register");

// ================= BADGES =================

function getBadge(user){

if(user === "AdminGrigory"
|| user === "SUIDKOP"){

return " 🏅";
}

if(user.endsWith("_vip")){
return " ✔️";
}

return "";

}

// ================= CHAT =================

function addMessage(msg){

const messages =
document.getElementById("messages");

const div =
document.createElement("div");

div.className =
msg.user === currentUser
? "message me"
: "message";

div.innerHTML = \`

<div class="avatar">
\${msg.user[0].toUpperCase()}
</div>

<div class="bubble">

<div
class="name"
onclick="openProfile('\${msg.user}')"
>
\${escapeHtml(msg.user)}
\${getBadge(msg.user)}
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

document.getElementById("messages")
.innerHTML = "";

data.forEach(addMessage);

}

function sendMessage(){

const input =
document.getElementById("messageInput");

const text =
input.value.trim();

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

// ================= PROFILE =================

async function openProfile(user){

openedProfile = user;

const res = await fetch("/profile",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user
})
});

const data = await res.json();

document.getElementById("profileModal")
.style.display = "flex";

document.getElementById("profileAvatar")
.innerText =
user[0].toUpperCase();

document.getElementById("profileName")
.innerHTML =
user + getBadge(user);

document.getElementById("profileBio")
.innerText =
data.bio || "Нет описания";

let badge = "";

if(data.official){

badge = "🏅 Официальный аккаунт";

}else if(data.verified){

badge = "✔️ Подтвержденный аккаунт";

}

document.getElementById("profileBadge")
.innerText = badge;

if(user === currentUser){

document.getElementById("bioInput")
.style.display = "block";

}else{

document.getElementById("bioInput")
.style.display = "none";

}

}

function closeProfile(){

document.getElementById("profileModal")
.style.display = "none";

}

async function saveBio(){

const bio =
document.getElementById("bioInput")
.value;

await fetch("/setBio",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user:currentUser,
bio
})
});

openProfile(currentUser);

}

// ================= SOCKET =================

socket.on("message",msg=>{
addMessage(msg);
});

socket.on("online",count=>{

document.getElementById("onlineCount")
.innerText =
"Онлайн: " + count;

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

if(!profiles.has(username)){

profiles.set(username,{
bio:"Описание отсутствует",
verified:false,
official:false
});

}

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

// ================= PROFILE API =================

app.post("/profile",(req,res)=>{

const { user } = req.body;

res.json(
profiles.get(user) || {
bio:"Нет описания",
verified:false,
official:false
}
);

});

app.post("/setBio",(req,res)=>{

const { user,bio } = req.body;

if(!profiles.has(user)){

profiles.set(user,{
bio:"",
verified:false,
official:false
});

}

profiles.get(user).bio = bio;

res.json({
success:true
});

});

// ================= SOCKET =================

io.on("connection",(socket)=>{

socket.on("join",(username)=>{

onlineUsers.set(socket.id,username);

io.emit("online",onlineUsers.size);

});

socket.on("message",(msg)=>{

globalMessages.push(msg);

if(globalMessages.length > 100){
globalMessages.shift();
}

io.emit("message",msg);

});

socket.on("disconnect",()=>{

onlineUsers.delete(socket.id);

io.emit("online",onlineUsers.size);

});

});

// ================= START =================

const PORT =
process.env.PORT || 3000;

server.listen(PORT,()=>{

console.log(
"SERVER STARTED " + PORT
);

});
