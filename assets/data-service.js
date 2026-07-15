const LOCAL_KEY='arownV3Data';
const FIREBASE_KEY='arownV31Firebase';
const DOC_PATH='site/content';
const SDK='https://www.gstatic.com/firebasejs/10.12.5';

export function getFirebaseSettings(){
  try{return JSON.parse(localStorage.getItem(FIREBASE_KEY)||'null')}catch{return null}
}
export function saveFirebaseSettings(v){localStorage.setItem(FIREBASE_KEY,JSON.stringify(v||{}))}
export function loadLocal(defaultData){
  try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||structuredClone(defaultData)}catch{return structuredClone(defaultData)}
}
export function saveLocal(data){localStorage.setItem(LOCAL_KEY,JSON.stringify(data))}

async function firebaseServices(){
  const settings=getFirebaseSettings();
  if(!settings?.enabled||!settings?.config?.apiKey||!settings?.config?.projectId)return null;
  const appMod=await import(`${SDK}/firebase-app.js`);
  const dbMod=await import(`${SDK}/firebase-firestore.js`);
  const storageMod=await import(`${SDK}/firebase-storage.js`);
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(settings.config);
  return {app,db:dbMod.getFirestore(app),storage:storageMod.getStorage(app),dbMod,storageMod};
}

export async function loadSiteData(defaultData){
  const local=loadLocal(defaultData);
  try{
    const f=await firebaseServices();
    if(!f)return {data:local,source:'local'};
    const [collection,docId]=DOC_PATH.split('/');
    const snap=await f.dbMod.getDoc(f.dbMod.doc(f.db,collection,docId));
    if(!snap.exists())return {data:local,source:'local'};
    const cloud=snap.data();saveLocal(cloud);return {data:cloud,source:'firebase'};
  }catch(error){return {data:local,source:'local',error:error.message}}
}

export async function saveSiteData(data){
  saveLocal(data);
  const f=await firebaseServices();
  if(!f)return {source:'local'};
  const [collection,docId]=DOC_PATH.split('/');
  await f.dbMod.setDoc(f.dbMod.doc(f.db,collection,docId),data,{merge:false});
  return {source:'firebase'};
}

export async function uploadImage(file,folder='images',onProgress){
  if(!file||!file.type?.startsWith('image/'))throw new Error('請選擇 JPG、PNG、WEBP 或其他圖片檔');
  const f=await firebaseServices();
  if(!f)throw new Error('尚未啟用 Firebase 或設定不完整');
  const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${folder}/${Date.now()}-${clean}`;
  const task=f.storageMod.uploadBytesResumable(f.storageMod.ref(f.storage,path),file,{contentType:file.type});
  return await new Promise((resolve,reject)=>task.on('state_changed',s=>{
    if(onProgress)onProgress(Math.round(s.bytesTransferred/s.totalBytes*100));
  },reject,async()=>resolve(await f.storageMod.getDownloadURL(task.snapshot.ref))));
}

export async function testFirebase(){
  const f=await firebaseServices();
  if(!f)throw new Error('尚未啟用 Firebase 或設定不完整');
  const [collection,docId]=DOC_PATH.split('/');
  await f.dbMod.getDoc(f.dbMod.doc(f.db,collection,docId));
  return true;
}