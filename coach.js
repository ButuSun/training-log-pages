// Daily recommendations stay in the editor snapshot until an exercise is confirmed.
let coachVersions = [];
let publishedCoach = null;
let activeCoach = null;
let coachLoadError = false;
let coachRequest = 0;

function currentCoach() {
  return (selected === today && activeCoach) || editorDrafts[today]?.coach || coachVersions.find(p=>p.date===today && p.planId===sessions[today]?.planId) || publishedCoach;
}

async function fetchCoach() {
  const request = ++coachRequest;
  const date = today;
  try {
    const res = await fetch('./daily-coach.json', {cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (!res.ok) throw Error('计划暂不可用');
    const data = await res.json();
    const plan = data.plans.filter(p => p.date === date).at(-1);
    if (request !== coachRequest || today !== date) return;
    coachVersions = data.plans;
    if (!activeCoach && sessions[selected]?.planId) {
      activeCoach = coachVersions.find(p=>p.date === selected && p.planId === sessions[selected].planId) || null;
      renderCoachEditor();
    }
    publishedCoach = plan || null;
    coachLoadError = false;
  } catch {
    if (request !== coachRequest) return;
    coachLoadError = true;
  }
  renderCoach();
}

function weightHistory(name, date) {
  return Object.values(sessions).filter(s => s.date <= date && !localEdits[s.date])
    .sort((a,b) => a.date.localeCompare(b.date)).flatMap(s => {
      const weights = s.exercises.filter(e => e.name === name && Number.isFinite(e.weight)).map(e => e.weight);
      return weights.length ? [{date:s.date, weight:Math.max(...weights)}] : [];
    }).slice(-5);
}

function historyChart(points) {
  const box = document.createElement('figure');
  const label = points.map(p => p.date.slice(5) + ' · ' + weightLabel(p.weight)).join('　');
  if (points.length > 1) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 260 48');
    svg.setAttribute('aria-hidden','true');
    const weights = points.map(p => p.weight);
    const low = Math.min(...weights), high = Math.max(...weights);
    const coords = points.map((p,i) => [6 + 248*i/(points.length-1),high === low ? 24 : 41-34*(p.weight-low)/(high-low)]);
    const line = document.createElementNS(svg.namespaceURI,'polyline');
    line.setAttribute('points',coords.map(c => c.join(',')).join(' '));
    line.setAttribute('fill','none');
    line.setAttribute('stroke','currentColor');
    line.setAttribute('stroke-width','2');
    svg.append(line);
    for (const [x,y] of coords) {
      const dot = document.createElementNS(svg.namespaceURI,'circle');
      dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('r','3');
      dot.setAttribute('fill','currentColor'); svg.append(dot);
    }
    box.append(svg);
  }
  box.append(text('figcaption',label ? '每次最高实重（kg）　'+label : '暂无同名动作的已同步重量记录'));
  return box;
}

function renderCoach() {
  const p = currentCoach();
  const reported = p?.status === 'completed';
  const ready = p?.status === 'training';
  const state = ready ? p.type+' 训练计划已生成' : reported ? p.type+' 训练已完成' :
    p ? '今日恢复安排已生成' : coachLoadError ? '计划读取失败，点开重试' : '今日计划待生成';
  $('coach-banner-label').textContent = '今日训练　·　'+state+'　 ›';
  $('coach-date').textContent = today;
  $('coach-title').textContent = state;
  $('coach-summary').textContent = p?.summary || (coachLoadError ? '暂时无法取得计划。' : '发布后可在这里查看今天的安排。');
  $('coach-items').replaceChildren();
  const items = reported ? [...new Set((sessions[today]?.exercises || []).map(e => e.name))].map(name=>({name})) : p?.items || [];
  for (const item of items) {
    const row = text('article','');
    const points = weightHistory(item.name,today);
    const previous = points.filter(point => point.date < today).at(-1);
    row.append(text('h3',item.name));
    if (ready) {
      const weight = item.suggestedWeight;
      row.append(text('strong',(weight == null ? '重量现场确认' : weightLabel(weight))+' × '+item.reps+' 次 × '+item.sets+' 组'));
      if (previous) {
        const delta = weight == null ? '' : '（本次 '+(weight-previous.weight > 0 ? '+' : '')+(weight-previous.weight)+' kg）';
        row.append(text('p','上次最高实际重量 '+weightLabel(previous.weight)+' '+delta));
      }
      row.append(text('p',item.technicalNote));
    } else if (reported) {
      row.append(text('p',sessions[today].exercises.filter(e=>e.name===item.name).map(e=>weightLabel(e.weight)+' × '+e.reps+' 次 × '+e.sets+' 组').join('，')));
    }
    row.append(historyChart(points)); $('coach-items').append(row);
  }
  $('coach-start').hidden = !ready;
  $('coach-retry').hidden = !coachLoadError;
  $('coach-start').textContent = editorDrafts[today]?.coach || sessions[today]?.planId ? '继续记录今天训练' : '开始今天训练';
}

function startCoach() {
  const plan = currentCoach();
  if (!plan || plan.date !== today || plan.status !== 'training' || !choose(today)) return;
  activeCoach ||= structuredClone(plan);
  hasChanges = true;
  openPage('log');
  renderDraft();
}

function renderCoachEditor() {
  const box = $('coach-editor');
  box.replaceChildren();
  box.hidden = !activeCoach;
  if (!activeCoach) return;
  box.append(text('strong',activeCoach.type+' 训练 · 点击动作填写实绩'));
  for (const item of activeCoach.items) {
    const done = draft.some(e => e.planItemId === item.id);
    const el = button((done ? '✓ ' : '')+item.name+'　'+(item.suggestedWeight == null ? '重量自选' : weightLabel(item.suggestedWeight))+' × '+item.reps+' × '+item.sets, () => {
      if (movement && !confirm('替换正在填写的动作？')) return;
      resetForm();
      applyPlan([item.name,'',item.suggestedWeight,item.reps,item.sets]);
      openComposer(el.getBoundingClientRect());
    });
    box.append(el);
  }
}

function showReceipt(date) {
  if ($('checkin-page').hidden || month !== date.slice(0,7)) return;
  const cell = $('calendar').querySelector('[data-date="'+date+'"] .mark');
  if (!cell || !hasTraining(sessions[date])) return;
  const message = date.slice(5)+' 训练签到成功';
  $('calendar-draft-status').textContent = message;
  const feedback = () => { if (!localEdits[date]) $('calendar-draft-status').textContent = message; };
  if (motionPreference.matches) { feedback(); return; }
  cell.animate([{transform:'translateY(-14px) scale(.45)',opacity:0},{transform:'translateY(2px) scale(1.35)',offset:.65},{transform:'translateY(-2px) scale(.95)',offset:.85},{transform:'scale(1)'}],{duration:520}).finished.then(feedback,feedback);
}

function matchesSavedRecord(record,saved) {
  if (!saved || (saved.note || '') !== (record.note || '') ||
      record.planId && saved.planId !== record.planId ||
      saved.exercises?.length !== record.exercises.length) return false;
  return record.exercises.every((entry,i) => {
    const actual = saved.exercises[i];
    return ['name','weight','sets','reps','rpe','note','planId','planItemId','suggestedWeight']
      .every(key => !(key in entry) || (entry[key] ?? null) === (actual[key] ?? null));
  });
}
