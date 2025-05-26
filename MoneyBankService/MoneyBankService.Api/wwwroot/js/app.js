
const API_BASE_URL = 'http://44.201.83.128/api/accounts';

// Elementos del DOM
const loadAccountsBtn = document.getElementById('load-accounts-btn');
const accountsTableBody = document.getElementById('accounts-table-body');
const accountsLoadingDiv = document.getElementById('accounts-loading');

const accountForm = document.getElementById('account-form');
const accountIdInput = document.getElementById('accountId');
const accountNumberInput = document.getElementById('accountNumber');
const ownerNameInput = document.getElementById('ownerName');
const accountTypeInput = document.getElementById('accountType');
const balanceAmountInput = document.getElementById('balanceAmount');
const formTitle = document.getElementById('form-title');
const formFeedback = document.getElementById('form-feedback');
const clearFormBtn = document.getElementById('clear-form-btn');
const formSection = document.getElementById('form-section'); 


const transactionForm = document.getElementById('transaction-form');
const transactionAccountIdInput = document.getElementById('transactionAccountId');
const transactionAccountNumberInput = document.getElementById('transactionAccountNumber');
const transactionValueInput = document.getElementById('transactionValue');
const depositBtn = document.getElementById('deposit-btn');
const withdrawBtn = document.getElementById('withdraw-btn');
const transactionFeedback = document.getElementById('transaction-feedback');


// --- Funciones de Feedback ---
function showFeedback(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'error' : 'success';
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
        element.textContent = '';
    }, 5000); // Ocultar después de 5 segundos
}

function showLoading(show) {
    accountsLoadingDiv.style.display = show ? 'block' : 'none';
}

// --- Lógica para Cuentas ---

async function fetchAccounts() {
    showLoading(true);
    accountsTableBody.innerHTML = ''; // Limpiar antes de cargar
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ Errors: ["Error desconocido del servidor."] }));
            throw new Error(`Error ${response.status}: ${(errorData.Errors || [response.statusText]).join(', ')}`);
        }
        const accounts = await response.json();
        
        if (accounts.length === 0) {
            accountsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay cuentas para mostrar.</td></tr>';
        } else {
            accounts.forEach(account => {
                const row = accountsTableBody.insertRow();
                // Formatear fecha
                const creationDate = new Date(account.creationDate).toLocaleDateString('es-ES', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });

                row.innerHTML = `
                    <td>${account.id}</td>
                    <td>${account.accountNumber}</td>
                    <td>${account.ownerName}</td>
                    <td>${account.accountType === 'A' ? 'Ahorros' : 'Corriente'}</td>
                    <td>${parseFloat(account.balanceAmount).toFixed(2)}</td>
                    <td>${parseFloat(account.overdraftAmount).toFixed(2)}</td>
                    <td>${creationDate}</td>
                    <td>
                        <button onclick="loadAccountForEdit(${account.id})">Editar</button>
                        <button class="delete-btn" onclick="deleteAccount(${account.id})">Eliminar</button>
                    </td>
                `;
            });
        }
    } catch (error) {
        console.error('Error al obtener cuentas:', error);
        showFeedback(formFeedback, `Error al cargar cuentas: ${error.message}`, true);
        accountsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Error al cargar cuentas: ${error.message}</td></tr>`;
    } finally {
        showLoading(false);
    }
}

function clearAccountForm() {
    accountForm.reset();
    accountIdInput.value = '';
    formTitle.textContent = 'Crear Nueva Cuenta';
    formFeedback.style.display = 'none';
    balanceAmountInput.readOnly = false; 
}

async function handleAccountFormSubmit(event) {
    event.preventDefault();
    formFeedback.style.display = 'none';

    const accountId = accountIdInput.value;
    const accountData = {
        accountNumber: accountNumberInput.value,
        ownerName: ownerNameInput.value,
        accountType: accountTypeInput.value,
        balanceAmount: parseFloat(balanceAmountInput.value),
        // El backend maneja el overdraftAmount, especialmente en la creación de cuentas tipo 'C'
        // Para PUT, si quisiéramos permitir su edición, lo incluiríamos aquí.
        // overdraftAmount: parseFloat(document.getElementById('overdraftAmount').value) 
    };

    let url = API_BASE_URL;
    let method = 'POST';

    if (accountId) { // Actualización
        accountData.id = parseInt(accountId);
        // Para PUT, aseguramos que todos los campos del DTO AccountDto estén presentes si es necesario.
        // El backend en UpdateAccountAsync espera `id`, `accountNumber`, `ownerName`, `accountType`, `balanceAmount`, `overdraftAmount`.
        // El `balanceAmount` y `overdraftAmount` para la actualización deben ser los valores actuales que se quieren establecer,
        // no deltas. El AccountService.cs asigna estos directamente.
        accountData.overdraftAmount = parseFloat(document.getElementById('account-form').elements.namedItem('overdraftAmount')?.value || 0); // Asegurarse de tener este campo si se edita
        url = `${API_BASE_URL}/${accountId}`;
        method = 'PUT';
    }


    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ Errors: ["Error al procesar la solicitud."] }));
            throw new Error(`Error ${response.status}: ${(errorData.Errors || [response.statusText]).join(', ')}`);
        }
        
        const resultMessage = `Cuenta ${accountId ? 'actualizada' : 'creada'} exitosamente!`;
        showFeedback(formFeedback, resultMessage, false);
        clearAccountForm();
        fetchAccounts();
    } catch (error) {
        console.error('Error al guardar cuenta:', error);
        showFeedback(formFeedback, `Error al guardar cuenta: ${error.message}`, true);
    }
}

async function loadAccountForEdit(id) {
    clearAccountForm(); // Limpiar antes de cargar nuevos datos
    formFeedback.style.display = 'none';
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ Errors: ["Error al obtener detalles de la cuenta."] }));
            throw new Error(`Error ${response.status}: ${(errorData.Errors || [response.statusText]).join(', ')}`);
        }
        const account = await response.json();
        
        formTitle.textContent = `Editar Cuenta (ID: ${account.id})`;
        accountIdInput.value = account.id;
        accountNumberInput.value = account.accountNumber;
        ownerNameInput.value = account.ownerName;
        accountTypeInput.value = account.accountType;
        balanceAmountInput.value = parseFloat(account.balanceAmount).toFixed(2);
        
        // Para la edición, el saldo y sobregiro no deberían ser editables directamente
        // ya que se modifican mediante transacciones o lógicas específicas del backend.
        // Por ahora, los mostramos pero podrían ser readonly o no estar en el form de edición.
        // Si tu lógica de PUT permite cambiar `balanceAmount` y `overdraftAmount` directamente:
        // (Esto es lo que parece hacer tu `AccountService.UpdateAccountAsync`)
        // Deberías tener un input para overdraftAmount si quieres editarlo:
        // document.getElementById('overdraftAmount').value = parseFloat(account.overdraftAmount).toFixed(2);
        
        // La creación de cuenta no permite saldo <= 0.
        // Durante la edición, el balance actual se carga. No se debería poder poner a cero o negativo aquí.
        // Si es necesario editar el saldo directamente (además de depósitos/retiros), tu backend lo permite.
        balanceAmountInput.readOnly = false; // O true, según tu lógica de negocio para la edición.

        window.scrollTo({ top: formSection.offsetTop, behavior: 'smooth' });


    } catch (error) {
        console.error('Error al cargar cuenta para editar:', error);
        showFeedback(formFeedback, `Error al cargar cuenta: ${error.message}`, true);
    }
}

async function deleteAccount(id) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta con ID ${id}?`)) {
        return;
    }
    formFeedback.style.display = 'none';
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) {
            const errorData = await response.json().catch(() => ({ Errors: ["Error al eliminar cuenta."] }));
            throw new Error(`Error ${response.status}: ${(errorData.Errors || [response.statusText]).join(', ')}`);
        }
        showFeedback(formFeedback, 'Cuenta eliminada exitosamente!', false);
        fetchAccounts();
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        showFeedback(formFeedback, `Error al eliminar cuenta: ${error.message}`, true);
    }
}


// --- Lógica para Transacciones ---

async function handleTransaction(type) { // type será 'Deposit' o 'Withdrawal'
    transactionFeedback.style.display = 'none';
    const accountId = transactionAccountIdInput.value;
    const accountNumber = transactionAccountNumberInput.value;
    const valueAmount = parseFloat(transactionValueInput.value);

    if (!accountId || !accountNumber || isNaN(valueAmount) || valueAmount <= 0) {
        showFeedback(transactionFeedback, 'Por favor, completa todos los campos de transacción correctamente y con un monto válido.', true);
        return;
    }

    const transactionData = { // Corresponde a TransactionDto
        id: parseInt(accountId), // El backend espera que el ID en el DTO coincida con el ID en la URL.
        accountNumber: accountNumber,
        valueAmount: valueAmount
    };

    const url = `${API_BASE_URL}/${accountId}/${type}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData),
        });

        if (!response.ok && response.status !== 204) { // 204 No Content es éxito
            const errorData = await response.json().catch(() => ({ Errors: [`Error al procesar ${type.toLowerCase()}.`] }));
            throw new Error(`Error ${response.status}: ${(errorData.Errors || [response.statusText]).join(', ')}`);
        }
        
        showFeedback(transactionFeedback, `¡${type === 'Deposit' ? 'Depósito' : 'Retiro'} realizado exitosamente!`, false);
        transactionForm.reset();
        fetchAccounts(); // Actualizar la tabla de cuentas
    } catch (error) {
        console.error(`Error al realizar ${type.toLowerCase()}:`, error);
        showFeedback(transactionFeedback, `Error al realizar ${type.toLowerCase()}: ${error.message}`, true);
    }
}


// --- Event Listeners ---
loadAccountsBtn.addEventListener('click', fetchAccounts);
accountForm.addEventListener('submit', handleAccountFormSubmit);
clearFormBtn.addEventListener('click', clearAccountForm);

depositBtn.addEventListener('click', () => handleTransaction('Deposit'));
withdrawBtn.addEventListener('click', () => handleTransaction('Withdrawal'));


// Cargar cuentas al iniciar
window.addEventListener('DOMContentLoaded', () => {
    clearAccountForm(); // Asegurar que el formulario esté limpio al cargar
    fetchAccounts();
});