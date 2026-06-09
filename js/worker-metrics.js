// js/worker-metrics.js
self.onmessage = function(event) {
    const { userInitialBudget, transactionList } = event.data;

    // Calcular egresos acumulados
    let totalExpenses = 0;
    if (transactionList && transactionList.length > 0) {
        totalExpenses = transactionList.reduce((accumulator, item) => accumulator + parseFloat(item.numAmount || 0), 0);
    }

    // Calcular saldo neto en caja
    let dynamicBalance = parseFloat(userInitialBudget) - totalExpenses;

    // Devolver resultados formateados al hilo principal
    self.postMessage({
        calculatedExpenses: totalExpenses.toFixed(2),
        dynamicBalance: dynamicBalance.toFixed(2)
    });
};