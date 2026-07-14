const LOCAL_KEY='arownV3Data';
const FIREBASE_KEY='arownV3Firebase';
const DOC_PATH='site/content';

export function getFirebaseSettings(){
  try{return JSON.parse(localStorage.getItem(FIREBASE_KEY)||'null')}catch{return null}
}
export function saveFirebaseSettings(v){localStorage.setItem(FIREBASE_KEY,JSON.stringify(v||{}))}
export function clearFirebaseSettings(){localStorage.removeItem(FIREBASE_KEY)}
export function loadLocal(defaultData){
  try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||structuredClone(defaultData)}catch{return structuredClone(defaultData)}
}
export function saveLocal(data){localStorage.setItem(LOCAL_KEY,JSON.stringify(data))}

async function getFirestore(){
  const settings=getFirebaseSettings();
  if(!settings?.enabled||!settings?.config?.apiKey||!settings?.config?.projectId)return null;
  const appMod=await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
  const dbMod=await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
  const app=appMod.getApps().length?appMod.getApps()[0]:appMod.initializeApp(settings.config);
  return {db:dbMod.getFirestore(app),dbMod};
}

export async function loadSiteData(defaultData){
  const local=loadLocal(defaultData);
  try{
    const f=await getFirestore();
    if(!f)return {data:local,source:'local'};
    const [collection,docId]=DOC_PATH.split('/');
    const snap=await f.dbMod.getDoc(f.dbMod.doc(f.db,collection,docId));
    if(snap.exists()){
      const cloud=snap.data();
      saveLocal(cloud);
      return {data:cloud,source:'firebase'};
    }
    return {data:local,source:'local'};
  }catch(error){return {data:local,source:'local',error:error.message}}
}

export async function saveSiteData(data){
  saveLocal(data);
  const f=await getFirestore();
  if(!f)return {source:'local'};
  const [collection,docId]=DOC_PATH.split('/');
  await f.dbMod.setDoc(f.dbMod.doc(f.db,collection,docId),data,{merge:false});
  return {source:'firebase'};
}

export async function testFirebase(){
  const f=await getFirestore();
  if(!f)throw new Error('尚未啟用 Firebase 或設定不完整');
  const [collection,docId]=DOC_PATH.split('/');
  await f.dbMod.getDoc(f.dbMod.doc(f.db,collection,docId));
  return true;
}
