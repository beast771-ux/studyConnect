import { useState } from "react";
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api"
});

function App() {

  const [username,setUsername] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [token,setToken] = useState("");

  const [groupName,setGroupName] = useState("");
  const [groups,setGroups] = useState([]);
  const [groupId,setGroupId] = useState("");

  const [topicName,setTopicName] = useState("");
  const [topics,setTopics] = useState([]);

  const [events,setEvents] = useState([]);

  const [file,setFile] = useState(null);

  /* ---------- SIGNUP ---------- */

  const signup = async () => {
    try{
      await API.post("/auth/signup",{username,email,password});
      alert("Signup successful");
    }catch(err){
      alert("Signup failed");
    }
  };

  /* ---------- LOGIN ---------- */

  const login = async () => {
    try{
      const res = await API.post("/auth/login",{email,password});
      setToken(res.data.token);
      alert("Login successful");
    }catch(err){
      alert("Login failed");
    }
  };

  /* ---------- CREATE GROUP ---------- */

  const createGroup = async () => {
    try{

      await API.post(
        "/groups",
        {
          name: groupName,
          description: "Demo group"
        },
        {
          headers:{Authorization:`Bearer ${token}`}
        }
      );

      alert("Group created");

    }catch(err){
      alert("Group creation failed");
    }
  };

  /* ---------- GET GROUPS ---------- */

  const getGroups = async () => {
    try{

      const res = await API.get("/groups",{
        headers:{Authorization:`Bearer ${token}`}
      });

      setGroups(res.data);

      if(res.data.length > 0){
        setGroupId(res.data[0]._id);
      }

    }catch(err){
      alert("Failed to fetch groups");
    }
  };

  /* ---------- CREATE TOPIC ---------- */

  const createTopic = async () => {

    try{

      await API.post(
        `/groups/${groupId}/topics`,
        {name: topicName},
        {headers:{Authorization:`Bearer ${token}`}}
      );

      alert("Topic created");

    }catch(err){
      alert("Topic creation failed");
    }

  };

  /* ---------- GET TOPICS ---------- */

  const getTopics = async () => {

    try{

      const res = await API.get(
        `/groups/${groupId}/topics`,
        {headers:{Authorization:`Bearer ${token}`}}
      );

      setTopics(res.data);

    }catch(err){
      alert("Failed to fetch topics");
    }

  };

  /* ---------- CREATE CALENDAR EVENT ---------- */

  const createEvent = async () => {

    try{

      await API.post(
        "/calendar/create",
        {
          title:"Study Session",
          groupId: groupId,
          eventDate: new Date()
        },
        {
          headers:{Authorization:`Bearer ${token}`}
        }
      );

      alert("Event created");

    }catch(err){
      alert("Event creation failed");
    }

  };

  /* ---------- GET EVENTS ---------- */

  const getEvents = async () => {

    try{

      const res = await API.get(
        `/calendar/group/${groupId}`,
        {headers:{Authorization:`Bearer ${token}`}}
      );

      setEvents(res.data);

    }catch(err){
      alert("Failed to fetch events");
    }

  };

  /* ---------- FILE UPLOAD ---------- */

  const uploadFile = async () => {

    try{

      const formData = new FormData();

      formData.append("file",file);
      formData.append("groupId",groupId);
      formData.append("topicId","demoTopic");
      formData.append("sender","demoUser");

      await axios.post(
        "http://localhost:8000/api/upload/file",
        formData,
        {
          headers:{
            Authorization:`Bearer ${token}`,
            "Content-Type":"multipart/form-data"
          }
        }
      );

      alert("File uploaded");

    }catch(err){
      alert("Upload failed");
    }

  };

  /* ---------- ANALYTICS ---------- */

  const analytics = async () => {

    try{

      const res = await API.get(
        `/analytics/group/${groupId}/activity`,
        {headers:{Authorization:`Bearer ${token}`}}
      );

      alert(JSON.stringify(res.data,null,2));

    }catch(err){
      alert("Analytics failed");
    }

  };

  return (
    <div style={{padding:"40px",fontFamily:"Arial"}}>

      <h1>StudyConnect Demo Dashboard</h1>

      <h2>Signup</h2>
      <input placeholder="username" onChange={e=>setUsername(e.target.value)} />
      <input placeholder="email" onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" onChange={e=>setPassword(e.target.value)} />
      <button onClick={signup}>Signup</button>

      <h2>Login</h2>
      <button onClick={login}>Login</button>

      <h2>Create Group</h2>
      <input placeholder="Group name" onChange={e=>setGroupName(e.target.value)} />
      <button onClick={createGroup}>Create</button>
      <button onClick={getGroups}>Load Groups</button>

      {groups.map(g=>(
        <div key={g._id}>{g.name}</div>
      ))}

      <h2>Topics</h2>
      <input placeholder="Topic name" onChange={e=>setTopicName(e.target.value)} />
      <button onClick={createTopic}>Create Topic</button>
      <button onClick={getTopics}>Load Topics</button>

      {topics.map(t=>(
        <div key={t._id}>{t.name}</div>
      ))}

      <h2>Calendar</h2>
      <button onClick={createEvent}>Create Event</button>
      <button onClick={getEvents}>Load Events</button>

      {events.map(e=>(
        <div key={e._id}>{e.title}</div>
      ))}

      <h2>File Upload</h2>
      <input type="file" onChange={(e)=>setFile(e.target.files[0])}/>
      <button onClick={uploadFile}>Upload</button>

      <h2>Analytics</h2>
      <button onClick={analytics}>Show Analytics</button>

    </div>
  );
}

export default App;