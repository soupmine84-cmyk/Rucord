const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
cors:{ origin:"*" }
});

app.use(express.json());

// ================= DATA =================

const users = new Map();
const globalMessages = [];
const onlineUsers = new Map();
const friends = new Map();

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
font-family:Arial;
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
display:flex;
align-items:center;
justify-content:center;
background:#0f1117;
z-index:100;
}

.login-box{
width:360px;
background:#161922;
padding:40px;
border-radius:24px;
}

.logo{
font-size:42px;
font-weight:800;
text-align:center;
margin-bottom:20px;
}

.input{
width:100%;
padding:16px;
border:none;
outline:none;
background:#1f2430;
color:white;
border-radius:16px;
margin-bottom:14px;
}

.btn{
width:100%;
padding:16px;
border:none;
border-radius:16px;
cursor:pointer;
font-weight:700;
margin-top:10px;
}

.login-btn{
background:#5865f2;
color:white;
}

.register-btn{
background:#2a2f3d;
color:white;
}

/* APP */

#app{
display:none;
height:100vh;
}

/* SIDEBAR */

.sidebar{
width:260px;
background:#12141c;
padding:20px;
overflow:auto;
}

.brand{
font-size:28px;
font-weight:800;
margin-bottom:10px;
}

.online{
margin-bottom:20px;
color:#8b93a7;
}

.channel{
padding:14px;
background:#1b1f2a;
border-radius:14px;
margin-bottom:10px;
cursor:pointer;
transition:.2s;
}

.channel:hover{
background:#2b3142;
}

.channel.active{
background:#5865f2;
}

/* CHAT */

.chat{
flex:1;
display:flex;
flex-direction:column;
}

.chat-top{
height:80px;
display:flex;
align-items:center;
padding:0 24px;
border-bottom:1px solid rgba(255,255,255,.05);
font-size:24px;
font-weight:700;
}

.messages{
flex:1;
overflow:auto;
padding:20px;
display:flex;
flex-direction:column;
gap:16px;
}

/* MESSAGE */

.message{
display:flex;
gap:12px;
align-items:flex-start;
}

.message.me{
flex-direction:row-reverse;
}

.avatar{
width:46px;
height:46px;
border-radius:50%;
background:#5865f2;
display:flex;
align-items:center;
justify-content:center;
font-weight:800;
flex-shrink:0;
}

.message.me .avatar{
background:#ff4fd8;
}

.bubble{
background:#1b1f2a;
padding:14px;
border-radius:18px;
max-width:600px;
}

.message.me .bubble{
background:linear-gradient(135deg,#5865f2,#7b61ff);
}

.name{
font-weight:700;
margin-bottom:6px;
color:#9ba8ff;
}

.message.me .name{
color:white;
text-align:right;
}

.message.me .text{
text-align:right;
}

/* INPUT */

.input-bar{
padding:20px;
display:flex;
gap:12px;
background:#12141c;
}

.msg-input{
flex:1;
padding:18px;
border:none;
outline:none;
background:#1b1f2a;
color:white;
border-radius:18px;
}

.send{
width:70px;
border:none;
border-radius:18px;
background:#5865f2;
color:white;
font-size:20px;
cursor:pointer;
}

/* FRIENDS */

.friend{
padding:14px;
background:#1b1f2a;
border-radius:14px;
margin-top:10px;
}

.hidden{
display:none;
}

</style>
</head>

<body>

<!-- LOGIN -->

<div id="login">

<div class="login-box">

<div class="logo">Rucord X</div>

<input
id="username"
class="input"
placeholder="Имя"
>

<input
id="password"
type="password"
class="input"
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
Регистрация
</button>

</div>

</div>

<!-- APP -->

<div id="app">

<div class="sidebar">

<div class="brand">
Rucord
</div>

<div
class="online"
id="onlineCount"
>
Онлайн: 0
</div>

<div
class="channel active"
onclick="openTab('chat')"
>
💬 Чат
</div>

<div
class="channel"
onclick="openTab('friends')"
>
👥 Друзья
</div>

<div
class="channel"
onclick="openTab('ai')"
>
🤖 AI
</div>

</div>

<div class="chat">

<div class="chat-top">
Rucord X
</div>

<!-- CHAT -->

<div
class="messages"
id="messages"
></div>

<!-- FRIENDS -->

<div
class="messages hidden"
id="friendsTab"
>

<h2>Друзья</h2>

<div id="friendsList"></div>

<br>

<input
id="friendInput"
class="msg-input"
placeholder="Имя друга"
>

<br><br>

<button
class="send"
onclick="addFriend()"
>
+
</button>

</div>

<!-- AI -->

<div
class="messages hidden"
id="aiTab"
>

<div id="aiMessages"></div>

</div>

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

<script src="/socket.io/socket.io.js"></script>

<script>

const socket = io();

let currentUser = "";

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
loadFriends();

}

document.getElementById("loginBtn")
.onclick = ()=>login("login");

document.getElementById("registerBtn")
.onclick = ()=>login("register");

// ================= TABS =================

function openTab(tab){

document.getElementById("messages")
.classList.add("hidden");

document.getElementById("friendsTab")
.classList.add("hidden");

document.getElementById("aiTab")
.classList.add("hidden");

if(tab === "chat"){
document.getElementById("messages")
.classList.remove("hidden");
}

if(tab === "friends"){
document.getElementById("friendsTab")
.classList.remove("hidden");
}

if(tab === "ai"){
document.getElementById("aiTab")
.classList.remove("hidden");
}

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

<div class="name">
\${msg.user}
</div>

<div class="text">
\${msg.text}
</div>

</div>
\`;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

async function loadMessages(){

const res =
await fetch("/messages");

const data =
await res.json();

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

// ================= AI =================

function sendAI(){

const text =
document.getElementById("messageInput")
.value;

socket.emit("ai",{
user:currentUser,
text
});

}

socket.on("ai",msg=>{

const div =
document.createElement("div");

div.className = "bubble";

div.innerHTML = \`
<div class="name">
AI
</div>

<div class="text">
\${msg.text}
</div>
\`;

document.getElementById("aiMessages")
.appendChild(div);

});

// ================= FRIENDS =================

async function addFriend(){

const friend =
document.getElementById("friendInput")
.value;

const res =
await fetch("/addFriend",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user:currentUser,
friend
})
});

const data =
await res.json();

alert(
data.success
? "Друг добавлен"
: data.message
);

loadFriends();

}

async function loadFriends(){

const res =
await fetch("/friends",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user:currentUser
})
});

const data =
await res.json();

const list =
document.getElementById("friendsList");

list.innerHTML = "";

data.forEach(friend=>{

const div =
document.createElement("div");

div.className = "friend";

div.innerText = "👤 " + friend;

list.appendChild(div);

});

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

res.json({
success:true
});

});

app.post("/login",(req,res)=>{

const { username,password } = req.body;

const user =
users.get(username);

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

// ================= FRIENDS =================

app.post("/addFriend",(req,res)=>{

const { user,friend } = req.body;

if(!users.has(friend)){

return res.json({
success:false,
message:"Пользователь не найден"
});

}

if(!friends.has(user)){
friends.set(user,[]);
}

friends.get(user).push(friend);

res.json({
success:true
});

});

app.post("/friends",(req,res)=>{

const { user } = req.body;

res.json(
friends.get(user) || []
);

});

// ================= SOCKET =================

io.on("connection",(socket)=>{

socket.on("join",(username)=>{

onlineUsers.set(socket.id,username);

io.emit(
"online",
onlineUsers.size
);

});

socket.on("message",(msg)=>{

globalMessages.push(msg);

if(globalMessages.length > 100){
globalMessages.shift();
}

io.emit("message",msg);

});

socket.on("ai",(data)=>{

socket.emit("ai",{
text:"🤖 AI: " + data.text
});

});

socket.on("disconnect",()=>{

onlineUsers.delete(socket.id);

io.emit(
"online",
onlineUsers.size
);

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
