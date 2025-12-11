// Comic-Con registration & schedule functionality
(function(){
    const STORAGE_KEY = 'comiccon_registrations_v1';

    // utility: get registrations
    function getRegistrations(){
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch(e){ console.error(e); return []; }
    }
    function saveRegistrations(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

    // validation helpers
    function isValidEmail(email){
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Registration form handling
    function initRegisterForm(){
        const form = document.getElementById('ccForm');
        if (!form) return;
        form.addEventListener('submit', function(e){
            e.preventDefault();
            const name = document.getElementById('attendeeName').value.trim();
            const email = document.getElementById('email').value.trim();
            const sessionTitle = document.getElementById('sessionTitle').value;
            const timeSlot = document.getElementById('timeSlot').value;
            const fandom = document.getElementById('fandomCategory').value;
            const notes = document.getElementById('cosplayNotes').value.trim();

            // clear errors
            ['nameError','emailError','sessionError','generalError'].forEach(id=>{
                const el=document.getElementById(id); if(el) el.textContent='';
            });

            let ok = true;
            if (!name || name.length<2){ document.getElementById('nameError').textContent='Please enter your name (2+ chars)'; ok=false; }
            if (!email){ document.getElementById('emailError').textContent='Please enter your email'; ok=false; }
            else if (!isValidEmail(email)){ document.getElementById('emailError').textContent='Please enter a valid email'; ok=false; }
            if (!sessionTitle){ document.getElementById('sessionError').textContent='Please select a session'; ok=false; }

            if (!ok) return;

            // optional conflict check: same session + same time
            if (sessionTitle && timeSlot){
                const regs = getRegistrations();
                const conflict = regs.find(r=>r.sessionTitle===sessionTitle && r.timeSlot===timeSlot);
                if (conflict){
                    document.getElementById('generalError').textContent = '⚠️ Time slot conflict: another attendee registered that session/time. Choose a different time or session.';
                    return;
                }
            }

            const registration = {
                id: Date.now(),
                attendeeName: name,
                email: email,
                sessionTitle: sessionTitle,
                timeSlot: timeSlot || '',
                fandomCategory: fandom || '',
                cosplayNotes: notes || '',
                createdAt: new Date().toISOString()
            };

            const arr = getRegistrations();
            arr.push(registration);
            saveRegistrations(arr);

            // save last id for quick lookup (optional)
            localStorage.setItem('comiccon_lastId', registration.id);

            // success feedback then redirect
            alert(`Registration saved. Redirecting to your schedule.`);
            window.location.href = 'comiccon_schedule.html';
        });
    }

    // Schedule page handling
    function initScheduleView(){
        const tableBody = document.querySelector('#scheduleTable tbody');
        const totalEl = document.getElementById('totalSessions');
        if (!tableBody || !totalEl) return;

        let registrations = getRegistrations();
        let sortAsc = true;

        function timeOrderKey(t){
            const map = {'9-am':9,'11-am':11,'1-pm':13,'3-pm':15,'5-pm':17};
            return map[t]||0;
        }

        function render(list){
            tableBody.innerHTML = '';
            if (!list || list.length===0){
                const tr = document.createElement('tr');
                const td = document.createElement('td'); td.colSpan=5; td.textContent='No sessions registered yet.'; td.style.color='#666'; td.style.textAlign='center';
                tr.appendChild(td); tableBody.appendChild(tr);
            } else {
                list.forEach((r, idx)=>{
                    const tr = document.createElement('tr');

                    const tdTime = document.createElement('td'); tdTime.textContent = r.timeSlot || 'TBD';
                    const tdTitle = document.createElement('td'); tdTitle.textContent = humanizeSession(r.sessionTitle);
                    const tdFandom = document.createElement('td'); tdFandom.textContent = r.fandomCategory || '-';
                    const tdNotes = document.createElement('td'); tdNotes.textContent = r.cosplayNotes || '-';

                    const tdActions = document.createElement('td');
                    const delBtn = document.createElement('button'); delBtn.textContent='Delete'; delBtn.className='btn danger';
                    delBtn.addEventListener('click', ()=>{ if(confirm('Delete this registration?')){ registrations.splice(idx,1); saveRegistrations(registrations); render(registrations); totalEl.textContent = registrations.length; } });
                    tdActions.appendChild(delBtn);

                    tr.appendChild(tdTime); tr.appendChild(tdTitle); tr.appendChild(tdFandom); tr.appendChild(tdNotes); tr.appendChild(tdActions);
                    tableBody.appendChild(tr);
                });
            }
            totalEl.textContent = (list && list.length) ? list.length : 0;
        }

        // helpers
        function humanizeSession(key){
            const map = {
                'marvel-cinematic-universe': "Marvel Cinematic Universe: What's Next",
                'anime-evolution': 'Anime Evolution: Past to Present',
                'gaming-future': "Gaming's Future: VR & Beyond",
                'sci-fi-legacy': 'Sci-Fi Legacy: 50 Years of Iconic Shows',
                'fantasy-world-building': 'Fantasy World Building Masterclass',
                'cosplay-competition': 'Cosplay Competition & Awards'
            };
            return map[key] || key;
        }

        // initial render
        render(registrations);

        // control: sort by time
        const sortBtn = document.getElementById('sortTimeBtn');
        if (sortBtn){
            sortBtn.addEventListener('click', ()=>{
                registrations.sort((a,b)=>{
                    return sortAsc ? (timeOrderKey(a.timeSlot)-timeOrderKey(b.timeSlot)) : (timeOrderKey(b.timeSlot)-timeOrderKey(a.timeSlot));
                });
                sortAsc = !sortAsc;
                render(registrations);
            });
        }

        // control: filter by fandom
        const filterFandom = document.getElementById('filterFandom');
        if (filterFandom){
            filterFandom.addEventListener('change', ()=>{
                const val = filterFandom.value;
                const filtered = val ? registrations.filter(r=>r.fandomCategory===val) : registrations.slice();
                render(filtered);
            });
        }

        // control: clear all
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn){
            clearAllBtn.addEventListener('click', ()=>{
                if (confirm('Clear all registrations? This cannot be undone.')){
                    registrations = []; saveRegistrations([]); render(registrations);
                }
            });
        }

        // export JSON
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn){
            exportBtn.addEventListener('click', ()=>{
                const dataStr = JSON.stringify(registrations, null, 2);
                const blob = new Blob([dataStr], {type:'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href=url; a.download='comiccon_registrations.json'; a.click(); URL.revokeObjectURL(url);
            });
        }
    }

    // Expose initScheduleView so schedule page can call after load
    window.initScheduleView = initScheduleView;

    // auto-init register form if on that page
    document.addEventListener('DOMContentLoaded', ()=>{
        initRegisterForm();
    });
})();