(() => {
  'use strict';
  const KEY = 'rsuFallScreenV2';
  const defaultState = () => ({ step: 0, patient: {}, screening: {}, tug: {}, balance: { times: [null, null, null, null] }, chair: {} });
  let state = load() || defaultState();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const stages = [
    ['Feet Together', 'ยืนเท้าชิดกัน'], ['Semi-tandem', 'ยืนกึ่งต่อเท้า'], ['Tandem', 'ยืนต่อเท้า'], ['Single Leg Stand', 'ยืนขาข้างเดียว']
  ];
  const labels = ['ข้อมูลผู้รับการประเมิน', 'คัดกรองความเสี่ยงการหกล้ม', 'Timed Up and Go Test', '4-Stage Balance Test', '30-Second Chair Stand Test', 'สรุปผลการประเมิน', 'ประเมินสภาพบ้านเสี่ยงล้ม', 'ประเมินปัจจัยเสี่ยงภายในและภายนอก', 'ประเมินภาวะมวลกล้ามเนื้อน้อย'];

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
    state.step = Math.max(0, Math.min(11, step)); save();
    $$('.step').forEach(el => { const on=Number(el.dataset.step)===state.step; el.hidden=!on; el.classList.toggle('active',on); });
    $('#progressBar').parentElement.hidden = state.step === 0 || state.step >= 7;
    $('#stepLabel').hidden = state.step === 0 || state.step >= 7;
    $('#progressBar').style.width = `${state.step / 6 * 100}%`;
    if(state.step > 0 && state.step <= 6) $('#stepLabel').textContent = `ขั้นตอนที่ ${state.step} จาก 6 · ${labels[state.step - 1]}`;
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
    // A "no" response to every screening question always finishes as Low Risk.
    // This must run before considering test data from a previous assessment.
    if(allScreeningNo()) return { level:'low', title:'เสี่ยงล้มต่ำ', detail:'ตอบ “ไม่” ทั้ง 3 ข้อในการคัดกรองความเสี่ยงการหกล้ม' };
    const s=state.screening, anyFail=[tugResult(),balanceResult(),chairResult()].some(x=>x===false), falls=s.fallHistory==='yes'?Number(s.fallCount):0, injury=s.injury==='yes';
    if(falls>=2) return { level:'very-high', title:'เสี่ยงล้มสูงมาก', detail:'มีประวัติหกล้มตั้งแต่ 2 ครั้งขึ้นไปใน 12 เดือนที่ผ่านมา' };
    if(falls===1 && injury) return { level:'high', title:'เสี่ยงล้มสูง', detail:'มีประวัติหกล้ม 1 ครั้งและได้รับบาดเจ็บ' };
    if(anyFail && falls===1) return { level:'moderate', title:'เสี่ยงล้มปานกลาง (มีปัจจัยเพิ่ม)', detail:'ไม่ผ่านอย่างน้อย 1 การทดสอบ และมีประวัติหกล้ม 1 ครั้งโดยไม่บาดเจ็บ' };
    if(anyFail) return { level:'moderate', title:'เสี่ยงล้มปานกลาง', detail:'ไม่ผ่านอย่างน้อย 1 การทดสอบ' };
    if(falls===1) return { level:'moderate', title:'เสี่ยงล้มปานกลาง', detail:'ผลการทดสอบผ่าน แต่มีประวัติหกล้ม 1 ครั้ง จึงควรประเมินเพิ่มเติม' };
    return { level:'low', title:'เสี่ยงล้มต่ำ', detail:'ผ่านการทดสอบทั้งหมดและไม่มีประวัติหกล้มใน 12 เดือนที่ผ่านมา' };
  }
  function carePlan(level){
    const low={
      assess:['ประเมินสมรรถภาพทางกายเบื้องต้น (SPPB) ได้แก่ Timed Up and Go (TUG), Five Times Sit-to-Stand Test (5xSTS), 4-Stage Balance Test','ประเมินความปลอดภัยของสภาพแวดล้อมภายในบ้าน (Home Safety Assessment)'],
      advice:['ส่งเสริมการออกกำลังกายอย่างสม่ำเสมอ อย่างน้อย 150 นาที/สัปดาห์ โดยเน้นการฝึกความแข็งแรงของกล้ามเนื้อ การทรงตัว และความยืดหยุ่น','ให้ความรู้เกี่ยวกับการป้องกันการหกล้ม','ส่งเสริมกิจกรรมทางกายที่เหมาะสม เช่น เดินเร็ว Tai Chi หรือ Otago Exercise Program'],
      follow:['ประเมินซ้ำทุก 12 เดือน','หากมีการหกล้มระหว่างปี ให้ประเมินใหม่ทันที']
    };
    const moderate={
      assess:['ประเมินการเดินและการทรงตัวอย่างละเอียด (BESTest, Mini-BESTest)','ประเมินกำลังกล้ามเนื้อ (Chair Stand Test หรือ Hand Grip Strength)','ประเมินความกลัวการล้ม (FES-I หรือ Thai FES-I)','ประเมินสภาพแวดล้อมในบ้าน','ประเมินการมองเห็น (Vision Assessment)','ทบทวนการใช้ยา (Medication review โดยเฉพาะยาที่เพิ่มความเสี่ยงล้ม)'],
      advice:['ออกกำลังกายเพื่อป้องกันการหกล้ม โดยแนะนำให้ได้รับการดูแลหรือประเมินโดยนักกายภาพบำบัด'],
      follow:['ประเมินซ้ำทุก 3–6 เดือน']
    };
    const high={
      assess:['ประเมินการเดินและการทรงตัวอย่างละเอียด (BESTest, Mini-BESTest)','ประเมินกำลังกล้ามเนื้อ (Chair Stand Test หรือ Hand Grip Strength)','ประเมินความกลัวการล้ม (FES-I หรือ Thai FES-I)','ประเมินสภาพแวดล้อมในบ้าน','ประเมินการมองเห็น (Vision)','ประเมินภาวะความดันโลหิตตกเมื่อเปลี่ยนท่า (Orthostatic hypotension)','ทบทวนการใช้ยา (Medication review โดยเฉพาะยาที่เพิ่มความเสี่ยงล้ม)','ประเมินภาวะซึมเศร้าและสุขภาพจิต (GDS)','ประเมินการรู้คิด (MMSE หรือ MoCA)','ประเมินการรับความรู้สึก (Peripheral sensation, Proprioception)','ประเมินโรคร่วมและภาวะกระดูกพรุน','พิจารณาปัจจัยเสี่ยงอื่น ๆ ที่อาจเกี่ยวข้อง'],
      advice:['ควรได้รับการดูแลโดยทีมสหสาขาวิชาชีพ พร้อมประเมินหาสาเหตุและจัดการปัจจัยเสี่ยงอย่างครอบคลุม','จัดโปรแกรมออกกำลังกายเฉพาะบุคคลโดยนักกายภาพบำบัด'],
      follow:['ประเมินซ้ำภายใน 30 วัน','ติดตามอย่างต่อเนื่องจนกว่าปัจจัยเสี่ยงจะลดลง']
    };
    return level==='low'?low:level==='moderate'?moderate:high;
  }
  function renderReport(){ const p=state.patient,s=state.screening,r=classify(),tug=tugResult(),bal=balanceResult(),chair=chairResult(); const f=s.fallHistory==='yes'?`${s.fallCount==='2'?'2 ครั้งขึ้นไป':'1 ครั้ง'}${s.injury==='yes'?' (บาดเจ็บ)':' (ไม่บาดเจ็บ)'}`:'ไม่เคย'; const times=(state.balance.times||[]).map((x,i)=>x===null?`${stages[i][0]}: ไม่ได้ทดสอบ`:`${stages[i][0]}: ${x} วินาที`).join('<br>'); const tests=allScreeningNo()?'<tr><td colspan="2">ไม่ต้องทำการทดสอบสมรรถภาพเพิ่มเติม เนื่องจากตอบ “ไม่” ทั้ง 3 ข้อ</td></tr>':`<tr><td>TUG</td><td>${state.tug.time} วินาที · ${tug?'ผ่าน':'ไม่ผ่าน'}</td></tr><tr><td>4-Stage Balance</td><td>${bal?'ผ่าน':'ไม่ผ่าน'}<br><small>${times}</small></td></tr><tr><td>30-sec Chair Stand</td><td>${state.chair.reps} ครั้ง · ${chair?'ผ่าน':'ไม่ผ่าน'}</td></tr>`;
    const plan=carePlan(r.level); const list=(items)=>`<ul class="recommendations">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    $('#report').innerHTML=`<div class="report-block"><h3>ข้อมูลผู้รับการประเมิน</h3><div class="report-grid"><p><b>ชื่อ:</b> ${safe(p.name)}</p><p><b>อายุ:</b> ${safe(p.age)} ปี</p><p><b>เพศ:</b> ${sexText(p.gender)}</p><p><b>วันที่ประเมิน:</b> ${safe(p.date)}</p><p><b>ผู้ประเมิน:</b> ${safe(p.assessor)}</p><p><b>หมายเหตุ:</b> ${safe(p.note||'-')}</p></div></div><div class="report-block"><h3>ผลการคัดกรองและการทดสอบ</h3><table class="summary-table"><thead><tr><th>รายการ</th><th>ผล</th></tr></thead><tbody><tr><td>ประวัติหกล้ม</td><td>${f}</td></tr><tr><td>เดินไม่มั่นคง / เซ</td><td>${yesNo(s.unsteady)}</td></tr><tr><td>กังวลหรือกลัวการล้ม</td><td>${yesNo(s.fear)}</td></tr>${tests}</tbody></table></div><div class="risk-banner risk-${r.level}"><h3>${r.title}</h3><p>${r.detail}</p></div><div class="report-block"><h3>ควรได้รับ</h3>${list(plan.assess)}</div><div class="report-block"><h3>คำแนะนำ</h3>${list(plan.advice)}</div><div class="report-block"><h3>การติดตาม</h3>${list(plan.follow)}</div>`;
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
  $('#newButton').addEventListener('click',()=>{if(confirm('กลับไปยังหน้า Home และเริ่มการประเมินใหม่? ข้อมูลที่ยังไม่ได้พิมพ์จะถูกล้าง')){state=defaultState();try{localStorage.removeItem(KEY);}catch{}fillPatient();fillScreening();$('#tugTime').value='';showStep(0);}});
  $('#startScreening').addEventListener('click',()=>{state=defaultState();fillPatient();fillScreening();$('#tugTime').value='';showStep(1);});
  $$('.risk-item').forEach((item,index)=>{ const illustration=document.createElement('i'); illustration.className=`risk-illustration panel-${index+1}`; illustration.setAttribute('aria-hidden','true'); item.insertBefore(illustration,item.children[1]); });
  $('#startHomeSafety').addEventListener('click',()=>{ $('#homeSafetyForm').reset(); $('#homeSafetyResult').hidden=true; showStep(7); });
  $('#backHome').addEventListener('click',()=>showStep(0));
  $('#homeSafetyForm').addEventListener('submit',e=>{ e.preventDefault(); const count=$$('input[name="homeRisk"]:checked').length; const result=$('#homeSafetyResult'); let level, advice, color; if(count<=2){level='🏠 บ้านควรระวัง'; advice='พบจุดเสี่ยงไม่เกิน 2 ข้อ ควรติดตามและปรับปรุงจุดเสี่ยงที่พบเพื่อป้องกันการหกล้ม'; color='house-green';}else if(count<=4){level='🏠 บ้านควรแก้ไข'; advice='พบจุดเสี่ยง 3–4 ข้อ ควรวางแผนแก้ไขจุดเสี่ยงภายในบ้าน'; color='house-yellow';}else{level='🏠 บ้านอันตราย แก้ไขด่วน'; advice='พบจุดเสี่ยงตั้งแต่ 5 ข้อขึ้นไป ควรเร่งแก้ไขและปรับสภาพแวดล้อมเพื่อความปลอดภัย'; color='house-red';} result.className=`home-result ${color}`; result.innerHTML=`<h3>${level}</h3><p>พบจุดเสี่ยงทั้งหมด <b>${count} ข้อ</b></p><p>${advice}</p>`; result.hidden=false; result.scrollIntoView({behavior:'smooth',block:'center'}); });
  const factorItems=[
    ['ประวัติการหกล้ม',['ไม่มีใน 1 ปีที่ผ่านมา','1 ครั้งใน 6 เดือนที่ผ่านมา','1 ครั้งใน 3 เดือนที่ผ่านมา','1 ครั้งในเดือนที่ผ่านมา หรือหลายครั้งใน 1 ปีที่ผ่านมา']],
    ['อายุ',['0–19 ปี','20–59 ปี','60–70 ปี','มากกว่า 70 ปี']],
    ['ยา',['ไม่ได้ทานยาที่เกี่ยวกับการรักษาหลอดเลือดและระบบประสาท','ทานยาที่เกี่ยวกับการรักษาหลอดเลือด หัวใจ หรือยาความดัน','ทานยาที่เกี่ยวกับระบบประสาท ยาซึมเศร้า ยานอนหลับ หรือยากล่อมประสาท','ทานยาที่เกี่ยวกับการรักษาหลอดเลือดและระบบประสาท หรือทานยา 4 ชนิด']],
    ['การทรงตัว TUG',['น้อยกว่า 10 วินาที และไม่ต้องใช้อุปกรณ์ช่วยเดิน','น้อยกว่า 10 วินาที แต่ต้องใช้อุปกรณ์ช่วยเดิน','10–20 วินาที','มากกว่า 20 วินาที และ/หรือไม่สามารถทำได้ด้วยตนเอง']],
    ['การรับรู้',['รู้เวลา สถานที่ บุคคล','รู้สถานที่ บุคคล','รู้บุคคล','ไม่รับรู้ หรือการตัดสินใจบกพร่อง']],
    ['สารอาหารและการนอนหลับ',['อาหารเพียงพอ นอนหลับปกติ','ไม่เจริญอาหาร หรือนอนไม่ค่อยหลับ','นอนหลับยาก','ขาดสารอาหาร น้ำหนักลด หรือนอนไม่หลับ']],
    ['การเจ็บเท้าและรองเท้า',['ไม่มีอาการปวดเท้าหรือภาวะนิ้วหัวแม่เท้าเอียง รองเท้าพอดีเท้า ส้นแบนหรือสูงน้อยกว่า 2.5 ซม. พื้นรองเท้าแน่น','ไม่มีอาการปวดเท้าหรือภาวะนิ้วหัวแม่เท้าเอียง แต่สวมรองเท้าแตะหรือรองเท้าที่ไม่เหมาะสมบางครั้ง','มีอาการปวดเท้าหรือภาวะนิ้วหัวแม่เท้าเอียงที่ไม่ส่งผลต่อการเดิน และสวมรองเท้าแตะหรือรองเท้าที่ไม่เหมาะสมบ่อยครั้ง','มีอาการปวดเท้าหรือภาวะนิ้วหัวแม่เท้าเอียงที่ส่งผลต่อการเดิน และสวมรองเท้าแตะหรือรองเท้าที่ไม่เหมาะสมบ่อยครั้ง']],
    ['การมองเห็น',['ปกติ','ใช้แว่นตา','มองเห็นไม่ชัด/ตาต้อ','มองเห็นผิดปกติถึงขั้นตาบอด']],
    ['การพูด',['ปกติ','มีปัญหาการพูดแต่เข้าใจภาษาดี','พูดไม่ชัด/มีปัญหาการสื่อสาร','สื่อสารบกพร่องขั้นรุนแรง']],
    ['ควบคุมการขับถ่าย',['ไม่มีปัญหา','ปัสสาวะบ่อย','ปัสสาวะตอนกลางคืนและปัสสาวะเล็ด','ปัสสาวะราด']],
    ['โรคเรื้อรัง',['ไม่มีโรค','มีโรคเรื้อรัง 1 โรค','มีโรคเรื้อรัง 2–3 โรค','มีโรคเรื้อรังหลายโรค (4 โรคขึ้นไป)']]
  ];
  const factorIcons=[
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v5l-3 3m3-3 4 2m-7 3-2 4m6-5 2 4"/></svg>',
    '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M7 11h10m-7 4h4"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="m10 4 8 8-6 6-8-8z"/><path d="m7 7 3-3 8 8"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v6m0-3 4 2m-4-2-3 3m-2 6 2-6m6 6-3-6"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 4a7 7 0 0 0-7 7c0 3 2 4 3 6h8c1-2 3-3 3-6a7 7 0 0 0-7-7Z"/><path d="M9 20h6m-5-3h4"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M20 15a8 8 0 1 1-9-11 7 7 0 0 0 9 11Z"/><path d="M17 5v3m-1.5-1.5h3"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 16c4-6 9-7 16-3l-3 5H7z"/><path d="M8 16v3m7-4v3"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M5 6h14v9H9l-4 3z"/><path d="M9 10h6m-6 3h4"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M10 8h4m-4 4h4m-2 4h.01"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-7 10-7 10Z"/><path d="M12 7v6m-3-3h6"/></svg>'
  ];
  function renderFactorQuestions(){ $('#factorQuestions').innerHTML=factorItems.map(([title,options],index)=>`<article class="factor-card"><h3 class="factor-heading"><span class="factor-icon" aria-hidden="true">${factorIcons[index]}</span><span>${index+1}. ${title}</span></h3><div class="factor-options">${options.map((text,score)=>`<label class="factor-option"><input type="radio" name="factor${index}" value="${score}"><span class="factor-score">${score}</span><span>${text}</span></label>`).join('')}</div></article>`).join(''); }
  $('#startFactorRisk').addEventListener('click',()=>{ renderFactorQuestions(); $('#factorResult').hidden=true; error('#factorError',''); showStep(8); });
  $('#factorBackHome').addEventListener('click',()=>showStep(0));
  $('#factorRiskForm').addEventListener('submit',e=>{ e.preventDefault(); const scores=factorItems.map((_,index)=>radio(`factor${index}`)); if(scores.some(score=>score==='')){error('#factorError','กรุณาเลือกคำตอบให้ครบทั้ง 11 ข้อ');return;} error('#factorError',''); const total=scores.reduce((sum,score)=>sum+Number(score),0); let title,detail,color; if(total<=10){title='ความเสี่ยงล้มระดับต่ำ';detail='คะแนนรวม 0–10 คะแนน';color='house-green';}else if(total<=20){title='ความเสี่ยงล้มระดับปานกลาง';detail='คะแนนรวม 11–20 คะแนน';color='house-yellow';}else{title='ความเสี่ยงล้มระดับสูง';detail='คะแนนรวม 21–33 คะแนน';color='house-red';} state.factorRisk={scores,total};save();const result=$('#factorResult');result.className=`home-result ${color}`;result.innerHTML=`<h3>${title}</h3><p>คะแนนรวม <b>${total} / 33 คะแนน</b></p><p>${detail}</p>`;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'center'}); });
  const sarcItems=[
    ['การยกและเคลื่อนย้ายสิ่งของน้ำหนัก 20 กิโลกรัม',['ไม่ยาก','ยากเล็กน้อย','ยาก']],
    ['การเดินภายในห้องหรือภายในบ้าน',['ไม่ยาก','ยากเล็กน้อย','ยาก']],
    ['การลุกยืนจากเก้าอี้หรือเตียงนอน',['ไม่ยาก','ยากเล็กน้อย','ยาก']],
    ['การขึ้นบันได 10 ขั้น',['ไม่ยาก','ยากเล็กน้อย','ยาก']],
    ['ประวัติการหกล้มภายใน 1 ปีที่ผ่านมา',['ไม่เคย','1–3 ครั้ง','ตั้งแต่ 4 ครั้งขึ้นไป']]
  ];
  function renderSarcQuestions(){ $('#sarcQuestions').innerHTML=sarcItems.map(([title,options],index)=>`<article class="factor-card"><h3 class="factor-heading"><span class="factor-icon" aria-hidden="true">${['↗','🚶','↑','▱','⚡'][index]}</span><span>${index+1}. ${title}</span></h3><div class="factor-options">${options.map((text,score)=>`<label class="factor-option"><input type="radio" name="sarc${index}" value="${score}"><span class="factor-score">${score}</span><span>${text} (${score} คะแนน)</span></label>`).join('')}</div></article>`).join(''); }
  $('#startSarcF').addEventListener('click',()=>{renderSarcQuestions();$('#sarcForm').reset();$('#sarcResult').hidden=true;error('#sarcError','');showStep(9);});
  $('#sarcBackHome').addEventListener('click',()=>showStep(0));
  $('#sarcForm').addEventListener('submit',e=>{e.preventDefault();const scores=sarcItems.map((_,index)=>radio(`sarc${index}`));const gender=radio('sarcGender');const calf=Number($('#calfCircumference').value);if(scores.some(x=>x==='')||!gender||$('#calfCircumference').value===''){error('#sarcError','กรุณาเลือกคำตอบให้ครบทั้ง 5 ข้อ ระบุเพศ และเส้นรอบวงน่อง');return;}error('#sarcError','');const sarcTotal=scores.reduce((sum,x)=>sum+Number(x),0);const cutoff=gender==='male'?34:33;const calfPass=calf>=cutoff;const sarcCalfTotal=sarcTotal+(calfPass?0:10);const lowRisk=sarcTotal<4&&calfPass;const result=$('#sarcResult');const color=lowRisk?'house-green':'house-red';const title=lowRisk?'ไม่พบความเสี่ยงต่อภาวะมวลกล้ามเนื้อน้อย':'ต้องสงสัยภาวะมวลกล้ามเนื้อน้อย';const advice=lowRisk?'แนะนำประเมินซ้ำใน 3 เดือน':'ควรได้รับการประเมินยืนยันและวางแผนดูแลโดยบุคลากรสุขภาพ';state.sarc={scores,sarcTotal,gender,calf,calfPass,sarcCalfTotal};save();result.className=`home-result ${color}`;result.innerHTML=`<h3>${title}</h3><p>SARC-F <b>${sarcTotal} / 10 คะแนน</b> · เส้นรอบวงน่อง ${calf.toFixed(1)} ซม. (${calfPass?'ผ่านเกณฑ์':'ไม่ผ่านเกณฑ์'})</p><p>SARC-CalF รวม <b>${sarcCalfTotal} / 20 คะแนน</b></p><p>${advice}</p>`;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'center'});});
  const miniSections=[
    ['การเตรียมการควบคุมการทรงตัวแบบรู้ล่วงหน้า',[['Sit to Stand','ลุกจากนั่ง'],['Rise to Toes','เขย่งปลายเท้า'],['Stand on One Leg','ยืนขาเดียว (เลือกข้างที่ได้คะแนนน้อยกว่า)']]],
    ['การปรับการทรงตัวต่อแรงรบกวนภายนอก',[['Compensatory Stepping Forward','ก้าวชดเชยไปข้างหน้า'],['Compensatory Stepping Backward','ก้าวชดเชยไปด้านหลัง'],['Compensatory Stepping Lateral','ก้าวชดเชยด้านข้าง (เลือกข้างที่ได้คะแนนน้อยกว่า)']]],
    ['การปรับการรับความรู้สึก',[['Stance Eyes Open, Firm Surface','ยืนเท้าชิด ลืมตา พื้นแข็ง'],['Stance Eyes Closed, Foam Surface','ยืนเท้าชิด หลับตา บนพื้นโฟม'],['Incline Eyes Closed','ยืนบนพื้นเอียง หลับตา']]],
    ['ความมั่นคงในการเดิน',[['Change in Gait Speed','เปลี่ยนความเร็วการเดิน'],['Walk with Head Turns – Horizontal','เดินพร้อมหันศีรษะในแนวราบ'],['Walk with Pivot Turns','เดินและหมุนตัว'],['Step over Obstacles','ก้าวข้ามสิ่งกีดขวาง'],['Timed Up & Go with Dual Task','TUG ร่วมกับงานซ้อน']]]
  ];
  function renderMiniBest(){let counter=0;$('#miniBestQuestions').innerHTML=miniSections.map(([title,items],section)=>`<article class="factor-card"><h3>${title} · คะแนนเต็ม ${items.length*2}</h3><div class="factor-options">${items.map(([en,th])=>{const i=counter++;return `<div class="factor-option"><span class="factor-score">${i+1}</span><span><b>${en}</b><br>${th}<div class="choice-row" style="margin-top:9px"><label class="choice"><input type="radio" name="mini${i}" value="0"> 0 รุนแรง</label><label class="choice"><input type="radio" name="mini${i}" value="1"> 1 ปานกลาง</label><label class="choice"><input type="radio" name="mini${i}" value="2"> 2 ปกติ</label></div></span></div>`;}).join('')}</div></article>`).join('');}
  // Original Mini-BESTest rating descriptions for each of the 14 items.
  // Score the lower-performing side for Stand on One Leg and Lateral Stepping.
  const miniCriteria=[
    [['2','Normal: Comes to stand without use of hands and stabilizes independently.'],['1','Moderate: Comes to stand WITH use of hands on first attempt.'],['0','Severe: Unable to stand up from chair without assistance, OR needs several attempts with use of hands.']],
    [['2','Normal: Stable for 3 s with maximum height.'],['1','Moderate: Heels up, but not full range, OR noticeable instability for 3 s.'],['0','Severe: < 3 s.']],
    [['2','Normal: 20 s.'],['1','Moderate: < 20 s.'],['0','Severe: Unable.']],
    [['2','Normal: Recovers independently with a single, large step (second realignment step is allowed).'],['1','Moderate: More than one step used to recover equilibrium.'],['0','Severe: No step, OR would fall if not caught, OR falls spontaneously.']],
    [['2','Normal: Recovers independently with a single, large step.'],['1','Moderate: More than one step used to recover equilibrium.'],['0','Severe: No step, OR would fall if not caught, OR falls spontaneously.']],
    [['2','Normal: Recovers independently with 1 step (crossover or lateral OK).'],['1','Moderate: Several steps to recover equilibrium.'],['0','Severe: Falls, OR cannot recover.']],
    [['2','Normal: 30 s.'],['1','Moderate: < 30 s.'],['0','Severe: Unable.']],
    [['2','Normal: 30 s.'],['1','Moderate: < 30 s.'],['0','Severe: Unable.']],
    [['2','Normal: Stands independently 30 s and aligns with gravity.'],['1','Moderate: Stands independently < 30 s OR aligns with surface.'],['0','Severe: Unable.']],
    [['2','Normal: Significantly changes walking speed without imbalance.'],['1','Moderate: Unable to change walking speed or signs of imbalance.'],['0','Severe: Unable to achieve significant change in walking speed AND signs of imbalance.']],
    [['2','Normal: Performs head turns with no change in gait speed and good balance.'],['1','Moderate: Performs head turns with reduction in gait speed.'],['0','Severe: Performs head turns with imbalance.']],
    [['2','Normal: Turns with feet close FAST (< 3 steps) with good balance.'],['1','Moderate: Turns with feet close SLOW (> 4 steps) with good balance.'],['0','Severe: Cannot turn with feet close at any speed without imbalance.']],
    [['2','Normal: Able to step over box with minimal change of gait speed and with good balance.'],['1','Moderate: Steps over box but touches box OR displays cautious behavior by slowing gait.'],['0','Severe: Unable to step over box OR steps around box.']],
    [['2','Normal: No noticeable change in sitting, standing or walking while backward counting compared with TUG without Dual Task.'],['1','Moderate: Dual Task affects either counting OR walking (>10%) when compared with TUG without Dual Task.'],['0','Severe: Stops counting while walking OR stops walking while counting.']]
  ];
  function oneLegScore(seconds){return seconds<=0?0:seconds>=20?2:1;}
  function calculatedMiniScore(index){
    if(index===2){
      const values=['leftTrial1','leftTrial2','rightTrial1','rightTrial2'].map(id=>$('#'+id)?.value);
      if(values.some(v=>v===''||v===undefined)) return '';
      const left=Math.max(Number(values[0]),Number(values[1]));
      const right=Math.max(Number(values[2]),Number(values[3]));
      return String(Math.min(oneLegScore(left),oneLegScore(right)));
    }
    if(index===5){const left=radio('miniLateralLeft'),right=radio('miniLateralRight');return left===''||right===''?'':String(Math.min(Number(left),Number(right)));}
    if(index===13){
      const tug=$('#miniTugTime')?.value,dual=$('#miniDualTugTime')?.value;
      if(tug===''||dual===''||Number(tug)<=0||Number(dual)<0) return '';
      return radio('mini13');
    }
    return radio(`mini${index}`);
  }
  function miniSpecialContent(index){
    if(index===2) return `<div class="mini-special"><p><b>Left:</b> Time in Seconds Trial 1 และ Trial 2 — ใช้เวลาที่มากกว่าเพื่อให้คะแนนด้านซ้าย</p><div class="field-grid"><label>Left Trial 1 (seconds)<input id="leftTrial1" type="number" min="0" step="0.1" inputmode="decimal"></label><label>Left Trial 2 (seconds)<input id="leftTrial2" type="number" min="0" step="0.1" inputmode="decimal"></label></div><p><b>Right:</b> Time in Seconds Trial 1 และ Trial 2 — ใช้เวลาที่มากกว่าเพื่อให้คะแนนด้านขวา</p><div class="field-grid"><label>Right Trial 1 (seconds)<input id="rightTrial1" type="number" min="0" step="0.1" inputmode="decimal"></label><label>Right Trial 2 (seconds)<input id="rightTrial2" type="number" min="0" step="0.1" inputmode="decimal"></label></div><p class="hint">คะแนนแต่ละข้าง: 2 = 20 s, 1 = &lt; 20 s, 0 = Unable. ระบบใช้คะแนนที่ต่ำกว่าระหว่างซ้ายและขวาเป็นคะแนนข้อ 3</p></div>`;
    if(index===5) return `<div class="mini-special"><p><b>Left:</b> เลือกผลการทดสอบด้านซ้าย</p><div class="choice-row">${miniCriteria[index].map(([score,text])=>`<label class="choice"><input type="radio" name="miniLateralLeft" value="${score}"> ${score} — ${text}</label>`).join('')}</div><p><b>Right:</b> เลือกผลการทดสอบด้านขวา</p><div class="choice-row">${miniCriteria[index].map(([score,text])=>`<label class="choice"><input type="radio" name="miniLateralRight" value="${score}"> ${score} — ${text}</label>`).join('')}</div><p class="hint">ระบบใช้คะแนนที่ต่ำกว่าระหว่างซ้ายและขวาเป็นคะแนนข้อ 6</p></div>`;
    if(index===13) return `<div class="mini-special"><div class="field-grid"><label>Timed Up & Go (seconds)<input id="miniTugTime" type="number" min="0" step="0.1" inputmode="decimal"></label><label>Timed Up & Go with Dual Task (seconds)<input id="miniDualTugTime" type="number" min="0" step="0.1" inputmode="decimal"></label></div><p id="miniDualTaskDifference" class="status neutral">กรอกเวลาทั้งสองช่อง เพื่อคำนวณความแตกต่าง</p><div class="factor-options" style="margin-top:9px">${miniCriteria[index].map(([score,text])=>`<label class="factor-option"><input type="radio" name="mini13" value="${score}"><span class="factor-score">${score}</span><span>${text}</span></label>`).join('')}</div><p class="hint">ระบบแสดงเปอร์เซ็นต์เพื่อช่วยตัดสินใจ แต่ผู้ประเมินเป็นผู้เลือกคะแนน โดยพิจารณาคุณภาพการเดินและการนับถอยหลังร่วมด้วย</p></div>`;
    return `<div class="factor-options" style="margin-top:9px">${miniCriteria[index].map(([score,text])=>`<label class="factor-option"><input type="radio" name="mini${index}" value="${score}"><span class="factor-score">${score}</span><span>${text}</span></label>`).join('')}</div>`;
  }
  function updateDualTaskDifference(){const normal=$('#miniTugTime')?.value,dual=$('#miniDualTugTime')?.value,box=$('#miniDualTaskDifference');if(!box)return;if(normal===''||dual===''||Number(normal)<=0||Number(dual)<0){box.className='status neutral';box.textContent='กรอกเวลาทั้งสองช่อง เพื่อคำนวณความแตกต่าง';return;}const difference=Number(dual)-Number(normal),percent=difference/Number(normal)*100;box.className=percent>10?'status fail':'status pass';box.textContent=`Dual Task ต่างจาก TUG ปกติ ${difference.toFixed(1)} วินาที (${percent>=0?'+':''}${percent.toFixed(1)}%)`;}
  function renderMiniBest(){let counter=0;$('#miniBestQuestions').innerHTML=miniSections.map(([title,items])=>`<article class="factor-card"><h3>${title} · คะแนนเต็ม ${items.length*2}</h3><div class="factor-options">${items.map(([en,th])=>{const i=counter++;return `<div class="factor-option"><span class="factor-score">${i+1}</span><span><b>${en}</b><br>${th}${miniSpecialContent(i)}</span></div>`;}).join('')}</div></article>`).join('');$$('#miniTugTime,#miniDualTugTime').forEach(input=>input.addEventListener('input',updateDualTaskDifference));}
  $('#startMiniBest').addEventListener('click',()=>{renderMiniBest();$('#miniBestForm').reset();$('#miniBestAge').value=state.patient.age??'';$('#miniBestResult').hidden=true;error('#miniBestError','');showStep(10);});
  $('#miniBestBackHome').addEventListener('click',()=>showStep(0));
  $('#miniBestForm').addEventListener('submit',e=>{e.preventDefault();const ageInput=$('#miniBestAge').value;const age=Number(ageInput);const scores=Array.from({length:14},(_,i)=>calculatedMiniScore(i));if(ageInput===''||!Number.isFinite(age)||age<0){error('#miniBestError','กรุณาระบุอายุผู้รับการประเมิน');return;}if(scores.some(x=>x==='')){error('#miniBestError','กรุณาให้คะแนนและกรอกข้อมูลครบทั้ง 14 รายการ');return;}error('#miniBestError','');const values=scores.map(Number);const sectionScores=[values.slice(0,3).reduce((a,b)=>a+b,0),values.slice(3,6).reduce((a,b)=>a+b,0),values.slice(6,9).reduce((a,b)=>a+b,0),values.slice(9,14).reduce((a,b)=>a+b,0)];const total=sectionScores.reduce((a,b)=>a+b,0);const cutoff=age>=60?18:22;const atRisk=total<cutoff;const ageCriterion=age>=60?'อายุ 60 ปีขึ้นไป: คะแนนน้อยกว่า 18 คะแนน มีความเสี่ยงล้ม':'อายุต่ำกว่า 60 ปี: ใช้เกณฑ์คะแนนน้อยกว่า 22 คะแนน มีความเสี่ยงล้ม';const result=$('#miniBestResult');result.innerHTML=miniSections.map(([title,items],i)=>`<article class="mini-result-card"><div class="mini-result-picture"></div><div class="mini-result-copy"><h3>${title}</h3><p><b>${sectionScores[i]} / ${items.length*2} คะแนน</b></p></div></article>`).join('')+`<div class="home-result ${atRisk?'house-red':'house-green'}" style="grid-column:1/-1"><h3>คะแนนรวม Mini-BESTest</h3><p><b>${total} / 28 คะแนน</b></p><p><b>${atRisk?'มีความเสี่ยงล้ม':'ไม่เข้าเกณฑ์เสี่ยงล้มตามคะแนน Mini-BESTest'}</b></p><p>${ageCriterion}</p></div>`;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'center'});});
  $('#startFeedback').addEventListener('click',()=>showStep(11));
  $('#feedbackBackHome').addEventListener('click',()=>showStep(0));
  $$('[data-future-module]').forEach(button=>button.addEventListener('click',()=>{$('#moduleMessage').textContent=`โมดูล “${button.dataset.futureModule}” อยู่ระหว่างพัฒนา`; }));
  fillPatient(); fillScreening(); $('#tugTime').value=state.tug.time??''; updateTugStatus(); showStep(0);
})();
