(() => {
  'use strict';
  const KEY = 'rsuFallScreenV2';
  const defaultState = () => ({ step: 1, patient: {}, screening: {}, tug: {}, balance: { times: [null, null, null, null] }, chair: {} });
  let state = load() || defaultState();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const stages = [
    ['Feet Together', 'ยืนเท้าชิดกัน'], ['Semi-tandem', 'ยืนกึ่งต่อเท้า'], ['Tandem', 'ยืนต่อเท้า'], ['Single Leg Stand', 'ยืนขาข้างเดียว']
  ];
  const labels = ['ข้อมูลผู้รับการประเมิน', 'คัดกรองความเสี่ยงการหกล้ม', 'Timed Up and Go Test', '4-Stage Balance Test', '30-Second Chair Stand Test', 'สรุปผลการประเมิน'];

  // Local Storage is unavailable in some browsers when this app is opened as file:///.
  // The assessment must still work in that situation; it simply will not survive a refresh.
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep the assessment in memory */ } }
  function radio(name){ return document.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
  function setRadio(name,value){ const el=document.querySelector(`input[name="${name}"][value="${value}"]`); if(el) el.checked=true; }
  function safe(v){ return String(v ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function sexText(v){ return v === 'male' ? 'ชาย' : v === 'female' ? 'หญิง' : '-'; }
  function yesNo(v){ return v === 'yes' ? 'ใช่' : v === 'no' ? 'ไม่ใช่' : '-'; }

  function showStep(step){
    state.step = Math.max(1, Math.min(6, step)); save();
    $$('.step').forEach(el => { const on=Number(el.dataset.step)===state.step; el.hidden=!on; el.classList.toggle('active',on); });
    $('#progressBar').style.width = `${state.step / 6 * 100}%`;
    $('#stepLabel').textContent = `ขั้นตอนที่ ${state.step} จาก 6 · ${labels[state.step - 1]}`;
    if(state.step === 4) renderBalance();
    if(state.step === 5) renderChair();
    if(state.step === 6) renderReport();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function error(id,text){ $(id).textContent=text; }
  function fillPatient(){ const p=state.patient; $('#patientName').value=p.name||''; $('#age').value=p.age??''; setRadio('gender',p.gender); $('#assessmentDate').value=p.date||new Date().toISOString().slice(0,10); $('#assessor').value=p.assessor||''; $('#note').value=p.note||''; }
  function fillScreening(){ const s=state.screening; setRadio('fallHistory',s.fallHistory); setRadio('fallCount',s.fallCount); setRadio('injury',s.injury); setRadio('unsteady',s.unsteady); setRadio('fear',s.fear); toggleFallDetails(); }
  function toggleFallDetails(){ const yes=radio('fallHistory')==='yes'; $('#fallDetails').hidden=!yes; if(!yes){ $$('input[name="fallCount"],input[name="injury"]').forEach(x=>x.checked=false); } }
  function tugResult(){ const time=Number(state.tug.time); if(!Number.isFinite(time)) return null; return time <= 13.5; }
  function updateTugStatus(){ const time=Number($('#tugTime').value); const box=$('#tugStatus'); if($('#tugTime').value==='' || !Number.isFinite(time)){ box.className='status neutral'; box.textContent='กรอกเวลาเพื่อแปลผลอัตโนมัติ'; return; } const pass=time<=13.5; box.className=`status ${pass?'pass':'fail'}`; box.textContent=pass ? `✓ ผ่านเกณฑ์ (${time} วินาที)` : `✕ ไม่ผ่านเกณฑ์ (${time} วินาที มากกว่า 13.5 วินาที)`; }
  function balanceResult(){ const times=state.balance.times||[]; if(times[0]===null || times.length!==4) return null; const firstFail=times.findIndex(v=>v!==null && Number(v)<10); if(firstFail>=0) return false; if(times.some(v=>v===null)) return null; return times.every(v=>Number(v)>=10); }
  function renderBalance(){
    const container=$('#balanceStages'); const times=state.balance.times||[null,null,null,null];
    container.innerHTML=stages.map(([name,thai],i)=>{ const priorFailed=times.slice(0,i).some(v=>v!==null && Number(v)<10); const disabled=priorFailed?'disabled':''; const val=times[i]??''; return `<article class="card stage-card ${priorFailed?'locked':''}"><h3><span class="stage-number">${i+1}</span>${name}</h3><p>${thai} เป็นเวลา 10 วินาที</p><label>เวลาที่ทำได้ (วินาที) *<input class="balance-time" data-index="${i}" type="number" min="0" max="60" step="0.1" inputmode="decimal" value="${val}" ${disabled} placeholder="เช่น 10"></label><div class="stage-status status neutral">${priorFailed?'หยุดการทดสอบ เนื่องจากท่าก่อนหน้าไม่ผ่าน':val===''?'กรอกเวลา':Number(val)>=10?'✓ ผ่านเกณฑ์':'✕ ไม่ผ่านเกณฑ์ — หยุดการทดสอบ'}</div></article>`; }).join('');
    $$('.balance-time').forEach(input=>input.addEventListener('input', e=>{ const i=Number(e.target.dataset.index); const v=e.target.value; state.balance.times[i]=v===''?null:Number(v); if(v!=='' && Number(v)<10) state.balance.times=state.balance.times.map((x,idx)=>idx>i?null:x); save(); renderBalance(); }));
    const result=balanceResult(), summary=$('#balanceSummary');
    if(result===null){summary.className='status neutral';summary.textContent='เริ่มกรอกเวลาของท่าที่ 1';}
    else if(result){summary.className='status pass';summary.textContent='✓ ผ่าน 4-Stage Balance Test';}
    else {summary.className='status fail';summary.textContent='✕ ไม่ผ่าน 4-Stage Balance Test';}
  }
  function chairCutoff(age,gender){
    const a=Number(age); let band=0; if(a>=90) band=6; else if(a>=85) band=5; else if(a>=80) band=4; else if(a>=75) band=3; else if(a>=70) band=2; else if(a>=65) band=1;
    const male=[14,12,12,11,10,8,7], female=[12,11,10,10,9,8,4]; return (gender==='male'?male:female)[band];
  }
  function chairResult(){ const r=Number(state.chair.reps); if(!Number.isFinite(r))return null; return r>chairCutoff(state.patient.age,state.patient.gender); }
  function renderChair(){ const p=state.patient; const cutoff=chairCutoff(p.age,p.gender); $('#chairReps').value=state.chair.reps??''; $('#chairCriterion').textContent=`เกณฑ์ผ่านสำหรับอายุ ${p.age} ปี เพศ${sexText(p.gender)}: มากกว่า ${cutoff} ครั้ง`; updateChairStatus(); }
  function updateChairStatus(){ const val=$('#chairReps').value, box=$('#chairStatus'); if(val===''){box.className='status neutral';box.textContent='ระบบจะใช้เกณฑ์ตามอายุและเพศที่กรอกไว้';return;} const reps=Number(val), cutoff=chairCutoff(state.patient.age,state.patient.gender), pass=reps>cutoff; box.className=`status ${pass?'pass':'fail'}`; box.textContent=pass?`✓ ผ่านเกณฑ์ (${reps} ครั้ง)`:`✕ ไม่ผ่านเกณฑ์ (${reps} ครั้ง; ต้องมากกว่า ${cutoff} ครั้ง)`; }
  function classify(){
    const s=state.screening, anyFail=[tugResult(),balanceResult(),chairResult()].some(x=>x===false), falls=s.fallHistory==='yes'?Number(s.fallCount):0, injury=s.injury==='yes';
    if(falls>=2) return { level:'very-high', title:'เสี่ยงล้มสูงมาก', detail:'มีประวัติหกล้มตั้งแต่ 2 ครั้งขึ้นไปใน 12 เดือนที่ผ่านมา' };
    if(falls===1 && injury) return { level:'high', title:'เสี่ยงล้มสูง', detail:'มีประวัติหกล้ม 1 ครั้งและได้รับบาดเจ็บ' };
    if(anyFail && falls===1) return { level:'moderate', title:'เสี่ยงล้มปานกลาง (มีปัจจัยเพิ่ม)', detail:'ไม่ผ่านอย่างน้อย 1 การทดสอบ และมีประวัติหกล้ม 1 ครั้งโดยไม่บาดเจ็บ' };
    if(anyFail) return { level:'moderate', title:'เสี่ยงล้มปานกลาง', detail:'ไม่ผ่านอย่างน้อย 1 การทดสอบ' };
    if(falls===1) return { level:'moderate', title:'เสี่ยงล้มปานกลาง', detail:'ผลการทดสอบผ่าน แต่มีประวัติหกล้ม 1 ครั้ง จึงควรประเมินเพิ่มเติม' };
    return { level:'low', title:'เสี่ยงล้มต่ำ', detail:'ผ่านการทดสอบทั้งหมดและไม่มีประวัติหกล้มใน 12 เดือนที่ผ่านมา' };
  }
  function recommendations(level){ const low=['ประเมินสภาพแวดล้อมในบ้าน','ประเมิน SPPB (TUG, 5-time sit to stand, 4-stage balance test)','ให้คำแนะนำการออกกำลังกายและการป้องกันการหกล้ม','ประเมินซ้ำใน 12 เดือน']; const moderate=['ประเมินการเดินและการทรงตัวอย่างละเอียด (BESTest หรือ Mini-BESTest)','ประเมินกำลังกล้ามเนื้อ เช่น Chair Stand Test หรือ Hand Grip Strength','ประเมินความกลัวการล้ม (FES-I หรือ Thai FES-I)','ประเมินสภาพแวดล้อมในบ้าน','ประเมินการมองเห็น (Vision)','ทบทวนการใช้ยา โดยเฉพาะยาที่เพิ่มความเสี่ยงล้ม','ประเมินซ้ำใน 3–6 เดือน']; const high=[...moderate.slice(0,5),'ประเมินภาวะความดันโลหิตตกเมื่อเปลี่ยนท่า (Orthostatic hypotension)','ทบทวนการใช้ยา โดยเฉพาะยาที่เพิ่มความเสี่ยงล้ม','ประเมินภาวะซึมเศร้าและสุขภาพจิต (GDS)','ประเมินการรู้คิด (MMSE หรือ MoCA)','ประเมินการรับความรู้สึก (Peripheral sensation, Proprioception)','ประเมินโรคร่วมและภาวะกระดูกพรุน','ประเมินซ้ำใน 30 วัน']; return level==='low'?low:level==='moderate'?moderate:high; }
  function renderReport(){ const p=state.patient,s=state.screening,r=classify(),tug=tugResult(),bal=balanceResult(),chair=chairResult(); const f=s.fallHistory==='yes'?`${s.fallCount==='2'?'2 ครั้งขึ้นไป':'1 ครั้ง'}${s.injury==='yes'?' (บาดเจ็บ)':' (ไม่บาดเจ็บ)'}`:'ไม่เคย'; const times=(state.balance.times||[]).map((x,i)=>x===null?`${stages[i][0]}: ไม่ได้ทดสอบ`:`${stages[i][0]}: ${x} วินาที`).join('<br>'); const tests=allScreeningNo()?'<tr><td colspan="2">ไม่ต้องทำการทดสอบสมรรถภาพเพิ่มเติม เนื่องจากตอบ “ไม่” ทั้ง 3 ข้อ</td></tr>':`<tr><td>TUG</td><td>${state.tug.time} วินาที · ${tug?'ผ่าน':'ไม่ผ่าน'}</td></tr><tr><td>4-Stage Balance</td><td>${bal?'ผ่าน':'ไม่ผ่าน'}<br><small>${times}</small></td></tr><tr><td>30-sec Chair Stand</td><td>${state.chair.reps} ครั้ง · ${chair?'ผ่าน':'ไม่ผ่าน'}</td></tr>`;
    $('#report').innerHTML=`<div class="report-block"><h3>ข้อมูลผู้รับการประเมิน</h3><div class="report-grid"><p><b>ชื่อ:</b> ${safe(p.name)}</p><p><b>อายุ:</b> ${safe(p.age)} ปี</p><p><b>เพศ:</b> ${sexText(p.gender)}</p><p><b>วันที่ประเมิน:</b> ${safe(p.date)}</p><p><b>ผู้ประเมิน:</b> ${safe(p.assessor)}</p><p><b>หมายเหตุ:</b> ${safe(p.note||'-')}</p></div></div><div class="report-block"><h3>ผลการคัดกรองและการทดสอบ</h3><table class="summary-table"><thead><tr><th>รายการ</th><th>ผล</th></tr></thead><tbody><tr><td>ประวัติหกล้ม</td><td>${f}</td></tr><tr><td>เดินไม่มั่นคง / เซ</td><td>${yesNo(s.unsteady)}</td></tr><tr><td>กังวลหรือกลัวการล้ม</td><td>${yesNo(s.fear)}</td></tr>${tests}</tbody></table></div><div class="risk-banner risk-${r.level}"><h3>${r.title}</h3><p>${r.detail}</p></div><div class="report-block"><h3>ควรได้รับการประเมิน / ดูแลต่อ</h3><ul class="recommendations">${recommendations(r.level).map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  }
  function allScreeningNo(){const s=state.screening;return s.fallHistory==='no'&&s.unsteady==='no'&&s.fear==='no';}
  function validateScreening(){const s=state.screening;if(!s.fallHistory||!s.unsteady||!s.fear)return 'กรุณาตอบคำถามคัดกรองทั้ง 3 ข้อ';if(s.fallHistory==='yes'&&(!s.fallCount||!s.injury))return 'กรุณาระบุจำนวนครั้งที่หกล้มและการบาดเจ็บ';return '';}
  $('#patientForm').addEventListener('submit',e=>{e.preventDefault();const p={name:$('#patientName').value.trim(),age:$('#age').value,gender:radio('gender'),date:$('#assessmentDate').value,assessor:$('#assessor').value.trim(),note:$('#note').value.trim()};if(!p.name||!p.age||!p.gender||!p.date||!p.assessor){error('#patientError','กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ');return;}error('#patientError','');state.patient=p;save();showStep(2);});
  $$('input[name="fallHistory"]').forEach(x=>x.addEventListener('change',toggleFallDetails));
  $('#screeningForm').addEventListener('submit',e=>{e.preventDefault();state.screening={fallHistory:radio('fallHistory'),fallCount:radio('fallCount'),injury:radio('injury'),unsteady:radio('unsteady'),fear:radio('fear')};const msg=validateScreening();if(msg){error('#screeningError',msg);return;}error('#screeningError','');save();showStep(allScreeningNo()?6:3);});
  $('#tugTime').addEventListener('input',()=>{state.tug.time=$('#tugTime').value===''?null:Number($('#tugTime').value);save();updateTugStatus();});
  $('#tugForm').addEventListener('submit',e=>{e.preventDefault();if($('#tugTime').value===''||Number($('#tugTime').value)<0){error('#tugError','กรุณากรอกเวลา TUG');return;}error('#tugError','');showStep(4);});
  $('#balanceForm').addEventListener('submit',e=>{e.preventDefault();const times=state.balance.times||[];const fail=times.findIndex(v=>v!==null&&Number(v)<10);if(times[0]===null){error('#balanceError','กรุณากรอกเวลาของท่าที่ 1');return;}if(fail===-1&&times.some(v=>v===null)){error('#balanceError','กรุณาทดสอบให้ครบทั้ง 4 ท่า หรือกรอกเวลาที่ทำได้ไม่ถึง 10 วินาที');return;}error('#balanceError','');save();showStep(5);});
  $('#chairReps').addEventListener('input',()=>{state.chair.reps=$('#chairReps').value===''?null:Number($('#chairReps').value);save();updateChairStatus();});
  $('#chairForm').addEventListener('submit',e=>{e.preventDefault();if($('#chairReps').value===''||Number($('#chairReps').value)<0){error('#chairError','กรุณากรอกจำนวนครั้งที่ทำได้');return;}error('#chairError','');save();showStep(6);});
  $$('[data-back]').forEach(b=>b.addEventListener('click',()=>showStep(state.step-1)));
  $('#printButton').addEventListener('click',()=>window.print());
  $('#newButton').addEventListener('click',()=>{if(confirm('เริ่มการประเมินใหม่? ข้อมูลที่ยังไม่ได้พิมพ์จะถูกล้าง')){state=defaultState();try{localStorage.removeItem(KEY);}catch{}fillPatient();fillScreening();$('#tugTime').value='';showStep(1);}});
  fillPatient(); fillScreening(); $('#tugTime').value=state.tug.time??''; updateTugStatus(); showStep(state.step||1);
})();
