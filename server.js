// ================= PART 1 =================
// ВСТАВЬ В САМЫЙ ВЕРХ server.js
// ПОСЛЕ require()

const fs = require("fs");



// ================= DATA =================

const users = new Map();
const globalMessages = [];
const onlineUsers = new Map();

const profiles = new Map();
const avatars = new Map();

const friends = new Map();
const privateChats = new Map();
const groups = new Map();



// ================= LOAD SAVED =================

if(fs.existsSync("profiles.json")){

const saved =
JSON.parse(
fs.readFileSync("profiles.json")
);

Object.entries(saved)
.forEach(([k,v])=>{

profiles.set(k,v);

});

}

if(fs.existsSync("avatars.json")){

const saved =
JSON.parse(
fs.readFileSync("avatars.json")
);

Object.entries(saved)
.forEach(([k,v])=>{

avatars.set(k,v);

});

}



// ================= VERIFIED =================

function getBadge(user){

if(
user === "AdminGrigory"
||
user === "SUIDKOP"
){

return "✔️";

}

return "";

}



// ================= PROFILE API =================

app.post("/saveProfile",(req,res)=>{

const { user,bio } = req.body;

if(!profiles.has(user)){

profiles.set(user,{
bio:""
});

}

profiles.get(user).bio = bio;

fs.writeFileSync(
"profiles.json",
JSON.stringify(
Object.fromEntries(profiles)
)
);

res.json({
success:true
});

});



app.post("/getProfile",(req,res)=>{

const { user } = req.body;

res.json(
profiles.get(user)
||
{
bio:""
}
);

});



// ================= AVATAR API =================

app.post("/saveAvatar",(req,res)=>{

const { user,avatar } = req.body;

avatars.set(user,avatar);

fs.writeFileSync(
"avatars.json",
JSON.stringify(
Object.fromEntries(avatars)
)
);

res.json({
success:true
});

});



app.post("/getAvatar",(req,res)=>{

const { user } = req.body;

res.json({
avatar:
avatars.get(user)
|| null
});

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

if(
!friends.get(user)
.includes(friend)
){

friends.get(user)
.push(friend);

}

res.json({
success:true
});

});



app.post("/friends",(req,res)=>{

const { user } = req.body;

res.json(
friends.get(user)
|| []
);

});



// ================= PRIVATE CHAT =================

app.post("/privateMessages",(req,res)=>{

const { u1,u2 } = req.body;

const key =
[u1,u2]
.sort()
.join("_");

res.json(
privateChats.get(key)
|| []
);

});



// ================= GROUPS =================

app.post("/createGroup",(req,res)=>{

const { name,owner } = req.body;

if(groups.has(name)){

return res.json({
success:false,
message:"Группа уже существует"
});

}

groups.set(name,{
owner,
messages:[]
});

res.json({
success:true
});

});



app.get("/groups",(req,res)=>{

res.json(
Array.from(groups.keys())
);

});

// ================= PART 2 =================
// ВСТАВЬ В HTML И JS


// ================= HTML =================

// ПЕРЕД </body>

<div id="profileModal"
style="
display:none;
position:fixed;
inset:0;
background:rgba(0,0,0,.7);
align-items:center;
justify-content:center;
z-index:9999;
">

<div style="
width:420px;
background:#181b24;
padding:30px;
border-radius:28px;
">

<div
id="profileAvatar"
style="
width:120px;
height:120px;
border-radius:50%;
margin:auto;
background:#5865f2;
background-size:cover;
background-position:center;
">
</div>

<h2
id="profileName"
style="
text-align:center;
margin-top:20px;
">
</h2>

<p
id="profileBio"
style="
margin-top:14px;
text-align:center;
color:#aaa;
">
</p>

<textarea
id="bioInput"
class="input"
placeholder="Описание профиля"
style="
height:120px;
margin-top:20px;
display:none;
">
</textarea>

<input
type="file"
id="avatarInput"
style="
margin-top:15px;
display:none;
"
>

<button
class="btn login-btn"
style="margin-top:20px;"
onclick="saveProfile()"
id="saveProfileBtn"
>
Сохранить
</button>

<button
class="btn register-btn"
style="margin-top:10px;"
onclick="closeProfile()"
>
Закрыть
</button>

</div>

</div>



// ================= PRIVATE CHAT MODAL =================

<div id="privateModal"
style="
display:none;
position:fixed;
inset:0;
background:rgba(0,0,0,.7);
align-items:center;
justify-content:center;
z-index:9999;
">

<div style="
width:500px;
height:700px;
background:#181b24;
border-radius:28px;
display:flex;
flex-direction:column;
overflow:hidden;
">

<div style="
padding:20px;
font-size:22px;
font-weight:700;
border-bottom:1px solid rgba(255,255,255,.08);
"
id="privateTitle">
ЛС
</div>

<div
id="privateMessages"
style="
flex:1;
overflow:auto;
padding:20px;
">
</div>

<div style="
padding:20px;
display:flex;
gap:10px;
">

<input
id="privateInput"
class="msg-input"
placeholder="Сообщение..."
>

<button
class="send"
onclick="sendPrivate()">
➤
</button>

</div>

</div>

</div>



// ================= FRIENDS =================

<div id="friendsModal"
style="
display:none;
position:fixed;
inset:0;
background:rgba(0,0,0,.7);
align-items:center;
justify-content:center;
z-index:9999;
">

<div style="
width:420px;
background:#181b24;
padding:30px;
border-radius:28px;
">

<h2>
👥 Друзья
</h2>

<input
id="friendInput"
class="input"
placeholder="Имя пользователя"
>

<button
class="btn login-btn"
onclick="addFriend()"
>
Добавить
</button>

<div
id="friendsList"
style="margin-top:20px;"
>
</div>

<button
class="btn register-btn"
onclick="closeFriends()"
>
Закрыть
</button>

</div>

</div>



// ================= CHANNELS =================

// В .channels ДОБАВЬ:

<div
class="channel"
onclick="openFriends()"
>
👥 Друзья
</div>

<div
class="channel"
onclick="openGroups()"
>
💬 Группы
</div>

<div
class="channel"
onclick="officialStatus()"
>
✔️ Официальный статус
</div>



// ================= MESSAGE FIX =================

// ЗАМЕНИ addMessage(msg)

function addMessage(msg){

const messages =
document.getElementById("messages");

const isMe =
msg.user === currentUser;

const badge =
msg.user === "AdminGrigory"
||
msg.user === "SUIDKOP"
? " ✔️"
: "";

const div =
document.createElement("div");

div.className = "message";

div.style.justifyContent =
isMe
? "flex-end"
: "flex-start";

div.innerHTML = \`

<div
style="
display:flex;
gap:14px;
flex-direction:
\${isMe ? "row-reverse" : "row"};
align-items:flex-start;
"
>

<div
class="avatar"
id="avatar_\${msg.user}"
onclick="openProfile('\${msg.user}')"
style="
cursor:pointer;
background-size:cover;
background-position:center;
">
\${msg.user[0].toUpperCase()}
</div>

<div
class="bubble"
style="
background:
\${isMe
? "linear-gradient(135deg,#5865f2,#7b61ff)"
: "#181b24"};
"
>

<div
class="name"
onclick="openProfile('\${msg.user}')"
style="cursor:pointer;"
>
\${escapeHtml(msg.user)}
\${badge}
</div>

<div class="text">
\${escapeHtml(msg.text)}
</div>

</div>

</div>

\`;

messages.appendChild(div);

loadAvatar(msg.user);

messages.scrollTop =
messages.scrollHeight;

}



// ================= PROFILE JS =================

async function openProfile(user){

document.getElementById("profileModal")
.style.display = "flex";

document.getElementById("profileName")
.innerText = user;

const res =
await fetch("/getProfile",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({user})
});

const data =
await res.json();

document.getElementById("profileBio")
.innerText =
data.bio || "Нет описания";

const avatar =
await fetch("/getAvatar",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({user})
});

const avatarData =
await avatar.json();

if(avatarData.avatar){

document.getElementById("profileAvatar")
.style.backgroundImage =
"url(" + avatarData.avatar + ")";

}

document.getElementById("bioInput")
.style.display =
user === currentUser
? "block"
: "none";

document.getElementById("avatarInput")
.style.display =
user === currentUser
? "block"
: "none";

document.getElementById("saveProfileBtn")
.style.display =
user === currentUser
? "block"
: "none";

}

function closeProfile(){

document.getElementById("profileModal")
.style.display = "none";

}

async function saveProfile(){

const bio =
document.getElementById("bioInput")
.value;

await fetch("/saveProfile",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user:currentUser,
bio
})
});

const file =
document.getElementById("avatarInput")
.files[0];

if(file){

const reader =
new FileReader();

reader.onload = async ()=>{

await fetch("/saveAvatar",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
user:currentUser,
avatar:reader.result
})
});

};

reader.readAsDataURL(file);

}

alert("Профиль сохранен");

}

async function loadAvatar(user){

const res =
await fetch("/getAvatar",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({user})
});

const data =
await res.json();

if(data.avatar){

const avatar =
document.getElementById(
"avatar_" + user
);

if(avatar){

avatar.style.backgroundImage =
"url(" + data.avatar + ")";

avatar.innerHTML = "";

}

}

}
