import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for better error logging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error status
            console.error('API Error:', error.response.status, error.response.data);
        } else if (error.request) {
            // Request made but no response
            console.error('Backend unreachable. Please ensure backend is running at http://localhost:8000');
        } else {
            console.error('Request setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

export const uploadMaster = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload/master', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getBatches = async () => {
    const response = await api.get('/batches');
    return response.data;
};

export const getBatchFiles = async (batchId) => {
    const response = await api.get('/files', {
        params: { batch_id: batchId }
    });
    return response.data;
};

export const approveCustomer = async (batchId, email) => {
    const response = await api.post('/files/approve', {
        batch_id: batchId,
        customer_email: email
    });
    return response.data;
};

export const rejectCustomer = async (batchId, email) => {
    const response = await api.post('/files/reject', {
        batch_id: batchId,
        customer_email: email
    });
    return response.data;
};

export const sendEmails = async (batchId, limit = null) => {
    const payload = { batch_id: batchId };
    if (limit !== null) {
        payload.limit = limit;
    }
    const response = await api.post('/email/send', payload);
    return response.data;
};

export const previewEmail = async (batchId, customerEmail) => {
    const response = await api.get('/email/preview', {
        params: {
            batch_id: batchId,
            customer_email: customerEmail
        }
    });
    return response.data;
};

export const sendSingleEmail = async (batchId, customerEmail) => {
    const response = await api.post('/email/send-single', {
        batch_id: batchId,
        customer_email: customerEmail
    });
    return response.data;
};

export const getEmailLogs = async () => {
    const response = await api.get('/email/logs');
    return response.data;
};

export const updateCustomer = async (batchId, email, updates) => {
    const response = await api.put('/files/update', {
        batch_id: batchId,
        customer_email: email,
        updates: updates
    });
    return response.data;
};

export const deleteCustomer = async (batchId, email) => {
    const response = await api.delete('/files/customer', {
        data: {
            batch_id: batchId,
            customer_email: email
        }
    });
    return response.data;
};

export default api;
