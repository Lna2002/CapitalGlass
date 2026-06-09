let sessionUser = null;
let globalBudget = 1500.00; 
let flowTransactions = [];
let asyncCoreWorker = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        const secureToken = sessionStorage.getItem('cg_token_auth');
        if (!secureToken) {
            window.location.href = 'index.html';
            return;
        }
        sessionUser = JSON.parse(secureToken);

        document.getElementById('user-display').innerHTML = `
            <i class="fa-solid fa-id-card text-primary"></i> <span style="letter-spacing:0.5px;">${sessionUser.fullName}</span>
        `;

        startAsyncWorker();
        fetchLocalStorageData();
        fetchLiveWeatherStream();

        document.getElementById('transaction-form').addEventListener('submit', processTransactionSubmit);
        document.getElementById('btn-cancel-edit').addEventListener('click', clearFormStates);
        document.getElementById('btn-set-budget').addEventListener('click', promptBudgetUpdate);
        document.getElementById('btn-logout').addEventListener('click', terminateUserSession);

    } catch (ex) {
        console.error("Fallo núcleo:", ex);
    }
});

function startAsyncWorker() {
    if (typeof(Worker) !== "undefined") {
        asyncCoreWorker = new Worker('js/worker-metrics.js');
        asyncCoreWorker.onmessage = function(event) {
            const { calculatedExpenses, dynamicBalance } = event.data;
            document.getElementById('metric-total-expenses').innerText = `$${calculatedExpenses}`;
            
            const elementBalance = document.getElementById('metric-balance');
            elementBalance.innerText = `$${dynamicBalance}`;

            const containerIcon = document.getElementById('metric-balance').closest('.metric-card-cg').querySelector('.card-icon-cg');
            let numericValue = parseFloat(dynamicBalance);
            
            if (numericValue < 0) {
                elementBalance.style.color = '#f43f5e';
                containerIcon.style.background = 'rgba(244, 63, 94, 0.25)';
                containerIcon.style.color = '#f43f5e';
            } else if (numericValue <= (globalBudget * 0.25)) {
                elementBalance.style.color = '#f59e0b';
                containerIcon.style.background = 'rgba(245, 158, 11, 0.25)';
                containerIcon.style.color = '#f59e0b';
            } else {
                elementBalance.style.color = '#10b981';
                containerIcon.style.background = 'rgba(16, 185, 129, 0.2)';
                containerIcon.style.color = '#10b981';
            }
        };
    }
}

function notifyWorkerRefresh() {
    document.getElementById('metric-budget').innerText = `$${globalBudget.toFixed(2)}`;
    if (asyncCoreWorker) {
        asyncCoreWorker.postMessage({ userInitialBudget: globalBudget, transactionList: flowTransactions });
    }
}

function fetchLocalStorageData() {
    try {
        const storedAmount = localStorage.getItem(`cg_vault_budget_${sessionUser.userEmail}`);
        globalBudget = storedAmount ? parseFloat(storedAmount) : 1500.00;

        const storedLedger = localStorage.getItem(`cg_vault_ledger_${sessionUser.userEmail}`);
        flowTransactions = storedLedger ? JSON.parse(storedLedger) : [];

        refreshMainTable();
        notifyWorkerRefresh();
    } catch (err) {
        console.error(err);
    }
}

function commitLocalStorageData() {
    localStorage.setItem(`cg_vault_budget_${sessionUser.userEmail}`, globalBudget.toString());
    localStorage.setItem(`cg_vault_ledger_${sessionUser.userEmail}`, JSON.stringify(flowTransactions));
    notifyWorkerRefresh();
}

function refreshMainTable() {
    const tableBody = document.getElementById('transactions-table-body');
    const emptyPlaceholder = document.getElementById('empty-state');
    tableBody.innerHTML = '';

    if (flowTransactions.length === 0) {
        emptyPlaceholder.classList.remove('hidden');
        return;
    }
    emptyPlaceholder.classList.add('hidden');

    const orderedTimeline = [...flowTransactions].sort((alpha, beta) => new Date(beta.timestampDate) - new Date(alpha.timestampDate));

    orderedTimeline.forEach(item => {
        const rowNode = document.createElement('tr');
        rowNode.innerHTML = `
            <td><strong>${sanitizeOutput(item.txtDescription)}</strong></td>
            <td><span class="badge-cat">${item.txtCategory}</span></td>
            <td><i class="fa-regular fa-calendar-check" style="color: var(--text-muted); margin-right: 5px;"></i> ${convertDateToHumanReadable(item.timestampDate)}</td>
            <td style="color: #f43f5e; font-weight: 700;">-$${parseFloat(item.numAmount).toFixed(2)}</td>
            <td class="actions-cell">
                <button class="btn-table-icon edit-icon" onclick="triggerEditSequence('${item.uniqueId}')"><i class="fa-solid fa-sliders"></i></button>
                <button class="btn-table-icon delete-icon" onclick="triggerDeleteSequence('${item.uniqueId}')"><i class="fa-solid fa-trash-arrow-up"></i></button>
            </td>
        `;
        tableBody.appendChild(rowNode);
    });
}

function processTransactionSubmit(e) {
    e.preventDefault();
    try {
        const hiddenId = document.getElementById('tx-id').value;
        const inputDesc = document.getElementById('tx-desc').value.trim();
        const inputAmount = parseFloat(document.getElementById('tx-amount').value);
        const inputCategory = document.getElementById('tx-category').value;
        const inputDate = document.getElementById('tx-date').value;

        if (hiddenId) {
            const targetIndex = flowTransactions.findIndex(t => t.uniqueId === hiddenId);
            if (targetIndex !== -1) {
                flowTransactions[targetIndex] = { uniqueId: hiddenId, txtDescription: inputDesc, numAmount: inputAmount, txtCategory: inputCategory, timestampDate: inputDate };
                Swal.fire({ icon: 'success', title: 'Registro Modificado', text: 'El historial ha sido actualizado.', timer: 1500, showConfirmButton: false });
            }
        } else {
            const newRecord = { uniqueId: "CG_" + Date.now().toString(), txtDescription: inputDesc, numAmount: inputAmount, txtCategory: inputCategory, timestampDate: inputDate };
            flowTransactions.push(newRecord);
            Swal.fire({ icon: 'success', title: 'Operación Asentada', text: 'Transacción confirmada.', timer: 1500, showConfirmButton: false });
        }

        commitLocalStorageData();
        refreshMainTable();
        clearFormStates();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

window.triggerEditSequence = function(id) {
    const activeItem = flowTransactions.find(t => t.uniqueId === id);
    if (!activeItem) return;

    document.getElementById('tx-id').value = activeItem.uniqueId;
    document.getElementById('tx-desc').value = activeItem.txtDescription;
    document.getElementById('tx-amount').value = activeItem.numAmount;
    document.getElementById('tx-category').value = activeItem.txtCategory;
    document.getElementById('tx-date').value = activeItem.timestampDate;

    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-sliders text-warning"></i> Editar Operación`;
    document.getElementById('btn-submit-tx').style.background = "#f59e0b";
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
};

window.triggerDeleteSequence = function(id) {
    Swal.fire({
        title: '¿Confirmar Purga?', text: "Se removerá el egreso de forma permanente.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#f43f5e', cancelButtonColor: '#334155', confirmButtonText: 'Sí, remover'
    }).then((res) => {
        if (res.isConfirmed) {
            flowTransactions = flowTransactions.filter(t => t.uniqueId !== id);
            commitLocalStorageData();
            refreshMainTable();
            Swal.fire('Purgado', 'Transacción eliminada.', 'success');
        }
    });
};

function clearFormStates() {
    document.getElementById('transaction-form').reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-square-plus text-primary"></i> Registrar Operación`;
    document.getElementById('btn-submit-tx').style.background = "#6366f1";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

function promptBudgetUpdate() {
    Swal.fire({
        title: 'Configurar Capital Inicial', text: 'Escribe tu capital base ($):', input: 'number', inputValue: globalBudget,
        showCancelButton: true, confirmButtonColor: '#6366f1', confirmButtonText: 'Actualizar'
    }).then((res) => {
        if (res.value) { globalBudget = parseFloat(res.value); commitLocalStorageData(); }
    });
}

function fetchLiveWeatherStream() {
    const labelWeather = document.getElementById('weather-status');
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const api = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code,wind_speed_10m`);
            const payload = await api.json();
            const code = payload.current.weather_code;
            let label = "Nublado ⛅", cls = "clima-nublado";

            document.body.classList.remove('clima-despejado', 'clima-nublado', 'clima-lluvioso', 'clima-tormenta');
            if (code === 0) { label = "Despejado ☀️"; cls = "clima-despejado"; }
            else if (code >= 51 && code <= 82) { label = "Lloviznas 🌧️"; cls = "clima-lluvioso"; }
            else if (code >= 95) { label = "Tormenta ⛈️"; cls = "clima-tormenta"; }
            document.body.classList.add(cls);

            labelWeather.innerHTML = `
                <span style="font-size: 1.4rem; font-weight: 800; color: #f59e0b;">${payload.current.temperature_2m.toFixed(1)}°C</span><br>
                <span style="font-size: 0.95rem; font-weight: 600; color: #fff;">${label}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 5px;">
                    <i class="fa-solid fa-wind"></i> Viento: ${payload.current.wind_speed_10m} km/h
                </span>
            `;
        } catch { labelWeather.innerText = "Error satélite."; }
    });
}

function convertDateToHumanReadable(str) {
    if(!str) return "";
    const s = str.split('-');
    const m = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${s[2]} de ${m[parseInt(s[1]) - 1]}`;
}

function terminateUserSession() {
    sessionStorage.removeItem('cg_token_auth');
    localStorage.removeItem('cg_remember_token'); 
    window.location.href = 'index.html';
}

function sanitizeOutput(t) { return t.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }