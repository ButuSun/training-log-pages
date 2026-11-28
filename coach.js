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

function renderCoach() {
  const current = currentCoach();
  const tomorrow = new Date(dateAt(today).getTime() + 86400000).toISOString().slice(0,10);
  const preview = (!current || current.status === 'completed') && coachVersions.filter(p => p.date === tomorrow).at(-1);
  const p = preview || current;
  const ready = p?.status === 'training';
  const title = p?.headline || (ready ? p.type+' 组训练' : p?.status === 'recovery' ? '按原安排恢复' : '训练建议');
  const day = preview ? '明日建议' : '今日建议';
  const fallback = coachLoadError ? '暂时无法读取，点开重试' : '等待发布';
  $('coach-banner-label').textContent = day+'　·　'+(p ? p.headline || p.summary.split(/[。！？\\n]/)[0] || title : fallback);
  $('coach-date').textContent = day+' · '+(p?.date || today);
  $('coach-title').textContent = title;
  $('coach-summary').textContent = p?.summary || fallback;
  $('coach-items').replaceChildren();
  for (const item of p?.items || []) {
    const row = text('article','');
    row.append(text('h3',item.name),text('strong',(item.suggestedWeight == null ? '重量现场确认' : weightLabel(item.suggestedWeight))+' × '+item.reps+' 次 × '+item.sets+' 组'),text('p',item.technicalNote));
    $('coach-items').append(row);
  }
  $('coach-start').hidden = !ready || p.date !== today;
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
