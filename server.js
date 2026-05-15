require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
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

const upload = multer({
  dest: "uploads/"
});

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

let users = {};
let accounts = [];

// SITE
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
font-family:Arial;
background:#202225;
color:white;
display:flex;
height:100vh;
overflow:hidden;
}

#sidebar{
width:260px;
background:#2f3136;
padding:10px;
overflow:auto;
}

#chat{
flex:1;
display:flex;
flex-direction:column;
}

#messages{
flex:1;
overflow:auto;
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
padding:10px;
background:#40444b;
}

input,button{
padding:10px;
border:none;
border-radius:8px;
margin:4px;
}

button{
cursor:pointer;
}

video{
width:220px;
border-radius:10px;
margin-top:10px;
}

a{
color:#00b0f4;
}

@media(max-width:700px){

body{
flex-direction:column;
}

#sidebar{
width:100%;
height:260px;
}

}

</style>

</head>

<body>

<div id="sidebar">

<h2>Rucord</h2>

<input id="username"
placeholder="username">

<input id="password"
type="password"
placeholder="password">

<button onclick="register()">
Register
</button>

<button onclick="login()">
Login
</button>

<hr>

<h3>Online</h3>

<div id="users"></div>

<hr>

<h3>Calls</h3>

<input id="callId"
placeholder="socket id">

<button onclick="callUser()">
Video Call
</button>

<button onclick="shareScreen()">
Screen Share
</button>

<video id="video"
autoplay muted></video>

<hr>

<h3>Upload</h3>

<input type="file"
id="file">

<button onclick="uploadFile()">
Upload
</button>

</div>

<div id="chat">

<div id="messages"></div>

<div id="bottom">

<input id="message"
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

const messages =
document.getElementById("messages");

// REGISTER
async function register(){

const username =
document.getElementById("username").value;

const password =
document.getElementById("password").value;

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
document.getElementById("username").value;

socket.emit(
"join",
username
);

addMessage(
"✅ logged in as " +
username
);

}

// SEND
function sendMessage(){

const input =
document.getElementById("message");

socket.emit(
"message",
input.value
);

input.value = "";

}

// RECEIVE
socket.on(
"message",
(data)=>{

addMessage(
"<b>" +
data.user +
"</b>: " +
data.text
);

}
);

// USERS
socket.on(
"users",
(data)=>{

const usersDiv =
document.getElementById("users");

usersDiv.innerHTML = "";

for(let id in data){

usersDiv.innerHTML +=
"<div class='msg'>" +
data[id] +
"<br><small>" +
id +
"</small></div>";

}

}
);

// SYSTEM
socket.on(
"system",
(msg)=>{

addMessage(
"⚡ " + msg
);

}
);

function addMessage(text){

messages.innerHTML +=
'<div class="msg">' +
text +
'</div>';

messages.scrollTop =
messages.scrollHeight;

}

// AI
async function askAI(){

const msg =
document.getElementById("message").value;

const res =
await fetch("/ai",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:msg
})
});

const data =
await res.json();

addMessage(
"🤖 " +
data.response
);

}

// VIDEO
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
"video"
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
"video"
).srcObject = stream;

}
);

// SCREEN SHARE
async function shareScreen(){

const stream =
await navigator.mediaDevices.getDisplayMedia({
video:true
});

document.getElementById(
"video"
).srcObject = stream;

}

// FILE UPLOAD
async function uploadFile(){

const file =
document.getElementById("file").files[0];

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
'📁 <a target="_blank" href="' +
data.url +
'">' +
file.name +
'</a>'
);

}

</script>

</body>
</html>

`);

});

// REGISTER
app.post("/register", async (req, res) => {

const { username, password } =
req.body;

const hashed =
await bcrypt.hash(password, 10);

accounts.push({
username,
password:hashed
});

res.json({
success:true
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

res.json({
response:"AI error"
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

socket.on(
"join",
(username)=>{

users[socket.id] =
username;

io.emit(
"users",
users
);

io.emit(
"system",
username +
" joined"
);

}
);

socket.on(
"message",
(msg)=>{

io.emit(
"message",
{
user:
users[socket.id],
text:msg
}
);

}
);

socket.on(
"call-user",
(data)=>{

io.to(data.to).emit(
"incoming-call"
);

}
);

socket.on(
"disconnect",
()=>{

delete users[socket.id];

io.emit(
"users",
users
);

}
);

});

server.listen(3000",()=>{

console.log(
"Rucord running"
);

});
