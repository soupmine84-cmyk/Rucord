require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OpenAI } = require("openai");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use("/uploads", express.static("uploads"));

// SQLITE
const db = new Database("rucord.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user'
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  text TEXT
)
`).run();

// FILES
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// OPENAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let users = {};
let groups = {};
let channels = {
  general: [],
  memes: [],
  gaming: []
};

// FRONTEND
app.get("/", (req, res) => {

res.send(`

<!DOCTYPE html>
<html>

<head>

<title>Rucord</title>

<meta name="viewport"
content="width=device-width, initial-scale=1.0">

<style>

body{
margin:0;
background:#202225;
color:white;
font-family:Arial;
display:flex;
height:100vh;
overflow:hidden;
}

#sidebar{
width:260px;
background:#2f3136;
padding:10px;
overflow-y:auto;
}

#chat{
flex:1;
display:flex;
flex-direction:column;
}

#messages{
flex:1;
overflow-y:auto;
padding:20px;
}

.msg{
background:#36393f;
padding:10px;
border-radius:10px;
margin-bottom:10px;
word-break:break-word;
}

#bottom{
background:#40444b;
padding:10px;
}

input,button{
padding:10px;
border:none;
border-radius:8px;
margin:2px;
}

button{
cursor:pointer;
}

.user{
background:#40444b;
padding:8px;
border-radius:8px;
margin-bottom:5px;
}

video{
width:220px;
border-radius:10px;
margin-top:10px;
}

@media(max-width:700px){

body{
flex-direction:column;
}

#sidebar{
width:100%;
height:250px;
}

}

</style>

</head>

<body>

<div id="sidebar">

<h2>Rucord</h2>

<h3>Register</h3>

<input id="regUser"
placeholder="username">

<input id="regPass"
type="password"
placeholder="password">

<button onclick="register()">
Register
</button>

<hr>

<h3>Login</h3>

<input id="loginUser"
placeholder="username">

<input id="loginPass"
type="password"
placeholder="password">

<button onclick="login()">
Login
</button>

<hr>

<h3>Users</h3>

<div id="users"></div>

<hr>

<h3>Channels</h3>

<button onclick="joinChannel('general')">
# general
</button>

<button onclick="joinChannel('gaming')">
# gaming
</button>

<button onclick="joinChannel('memes')">
# memes
</button>

<hr>

<h3>Private</h3>

<input id="privateId"
placeholder="socket id">

<button onclick="sendPrivate()">
Send PM
</button>

<hr>

<h3>Calls</h3>

<input id="callId"
placeholder="socket id">

<button onclick="callUser()">
Call
</button>

<button onclick="shareScreen()">
Screen
</button>

<video id="localVideo"
autoplay muted></video>

<hr>

<h3>Voice</h3>

<button onclick="startRecord()">
🎤 Start
</button>

<button onclick="stopRecord()">
⏹ Stop
</button>

<hr>

<h3>Upload</h3>

<input type="file"
id="fileInput">

<button onclick="uploadFile()">
Upload
</button>

</div>

<div id="chat">

<div id="messages"></div>

<div id="bottom">

<input id="messageInput"
placeholder="message..."
style="width:60%">

<button onclick="sendMessage()">
Send
</button>

<button onclick="askAI()">
AI
</button>

</div>

</div>

<script src="/socket.io/socket.io.js"></script>

<script>

const socket = io();

let currentChannel = "general";

const messages =
document.getElementById("messages");

// REGISTER
async function register(){

const username =
document.getElementById("regUser").value;

const password =
document.getElementById("regPass").value;

await fetch("/register",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
username,
password
})
});

alert("registered");

}

// LOGIN
async function login(){

const username =
document.getElementById("loginUser").value;

const password =
document.getElementById("loginPass").value;

const res = await fetch("/login",{
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

localStorage.setItem(
"token",
data.token
);

socket.emit(
"join",
data.username
);

addMessage(
"✅ Logged in as " +
data.username
);

}

// USERS
socket.on("users",(users)=>{

const usersDiv =
document.getElementById("users");

usersDiv.innerHTML = "";

for(let id in users){

usersDiv.innerHTML += \`
<div class="user">
\${users[id]}
<br>
<small>\${id}</small>
</div>
\`;

}

});

// SEND
function sendMessage(){

const input =
document.getElementById("messageInput");

socket.emit(
"channel_message",
{
channel:currentChannel,
message:input.value
}
);

input.value = "";

}

// RECEIVE
socket.on(
"channel_message",
(data)=>{

addMessage(
\`#\${data.channel}
<b>\${data.username}</b>:
\${data.message}\`
);

}
);

// PRIVATE
function sendPrivate(){

const id =
document.getElementById("privateId").value;

const message =
document.getElementById("messageInput").value;

socket.emit(
"private_message",
{
to:id,
message
}
);

}

socket.on(
"private_message",
(data)=>{

addMessage(
\`🔒
<b>\${data.username}</b>:
\${data.message}\`
);

}
);

// CHANNEL
function joinChannel(channel){

currentChannel = channel;

addMessage(
"Joined #" + channel
);

}

// SYSTEM
socket.on("system",(msg)=>{

addMessage(
"⚡ " + msg
);

});

function addMessage(text){

messages.innerHTML += \`
<div class="msg">
\${text}
</div>
\`;

messages.scrollTop =
messages.scrollHeight;

}

// AI
async function askAI(){

const input =
document.getElementById("messageInput");

const res = await fetch("/ai",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:input.value
})
});

const data =
await res.json();

addMessage(
"🤖 " + data.response
);

}

// CALL
async function callUser(){

const target =
document.getElementById("callId").value;

socket.emit(
"call-user",
{
to:target
}
);

const stream =
await navigator.mediaDevices.getUserMedia({
video:true,
audio:true
});

document.getElementById(
"localVideo"
).srcObject = stream;

}

socket.on(
"incoming-call",
async()=>{

alert("Incoming call");

const stream =
await navigator.mediaDevices.getUserMedia({
video:true,
audio:true
});

document.getElementById(
"localVideo"
).srcObject = stream;

}
);

// SCREEN SHARE
async function shareScreen(){

const screen =
await navigator.mediaDevices.getDisplayMedia({
video:true
});

document.getElementById(
"localVideo"
).srcObject = screen;

}

// VOICE MESSAGE
let mediaRecorder;
let audioChunks = [];

async function startRecord(){

const stream =
await navigator.mediaDevices.getUserMedia({
audio:true
});

mediaRecorder =
new MediaRecorder(stream);

mediaRecorder.start();

mediaRecorder.ondataavailable =
(e)=>{

audioChunks.push(e.data);

};

}

function stopRecord(){

mediaRecorder.stop();

mediaRecorder.onstop =
()=>{

const blob =
new Blob(audioChunks);

const url =
URL.createObjectURL(blob);

messages.innerHTML += \`
<div class="msg">
<audio controls src="\${url}">
</audio>
</div>
\`;

audioChunks = [];

};

}

// FILES
async function uploadFile(){

const file =
document.getElementById("fileInput").files[0];

const form =
new FormData();

form.append(
"file",
file
);

const res =
await fetch("/upload",{
method:"POST",
body:form
});

const data =
await res.json();

addMessage(
\`📁
<a href="\${data.url}"
target="_blank">
\${file.name}
</a>\`
);

}

</script>

</body>
</html>

`);

});

// REGISTER
app.post("/register", async (req, res) => {

const { username, password } = req.body;

const hashed =
await bcrypt.hash(password, 10);

try {

db.prepare(`
INSERT INTO users
(username,password)
VALUES (?,?)
`).run(username, hashed);

res.json({
success:true
});

} catch {

res.status(400).json({
error:"user exists"
});

}

});

// LOGIN
app.post("/login", async (req, res) => {

const { username, password } = req.body;

const user =
db.prepare(`
SELECT * FROM users
WHERE username = ?
`).get(username);

if(!user){

return res.status(400).json({
error:"user not found"
});

}

const valid =
await bcrypt.compare(
password,
user.password
);

if(!valid){

return res.status(400).json({
error:"wrong password"
});

}

const token = jwt.sign(
{
id:user.id,
username:user.username
},
"SECRET_KEY"
);

res.json({
token,
username:user.username
});

});

// AI
app.post("/ai", async (req, res) => {

try {

const response =
await openai.chat.completions.create({
model:"gpt-4.1-mini",
messages:[
{
role:"user",
content:req.body.message
}
]
});

res.json({
response:
response.choices[0]
.message.content
});

} catch {

res.status(500).json({
error:"AI error"
});

}

});

// FILE UPLOAD
app.post(
"/upload",
upload.single("file"),
(req,res)=>{

res.json({
url:
"/uploads/" +
req.file.filename
});

}
);

// SOCKET
io.on("connection",(socket)=>{

socket.on("join",(username)=>{

users[socket.id] = username;

io.emit(
"system",
username + " joined"
);

io.emit(
"users",
users
);

});

// CHANNEL CHAT
socket.on(
"channel_message",
(data)=>{

db.prepare(`
INSERT INTO messages
(username,text)
VALUES (?,?)
`).run(
users[socket.id],
data.message
);

io.emit(
"channel_message",
{
channel:data.channel,
username:
users[socket.id],
message:data.message
}
);

}
);

// PM
socket.on(
"private_message",
(data)=>{

io.to(data.to).emit(
"private_message",
{
username:
users[socket.id],
message:
data.message
}
);

}
);

// CALL
socket.on(
"call-user",
(data)=>{

io.to(data.to).emit(
"incoming-call",
{
from:socket.id
}
);

}
);

socket.on(
"disconnect",
()=>{

io.emit(
"system",
users[socket.id] +
" left"
);

delete users[socket.id];

io.emit(
"users",
users
);

}
);

});

server.listen(3000,()=>{
console.log("Rucord running");
});
