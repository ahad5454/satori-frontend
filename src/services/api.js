import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const labFeesAPI = {
  // Get all laboratories
  getLabs: async () => {
    try {
      console.log('Making API request to:', `${API_BASE_URL}/lab-fees/labs/`);
      const response = await api.get('/lab-fees/labs/');
      console.log('Labs API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching labs:', error);
      throw error;
    }
  },

  // Create a new laboratory
  createLab: async (labData) => {
    try {
      const response = await api.post('/lab-fees/labs/', labData);
      return response.data;
    } catch (error) {
      console.error('Error creating lab:', error);
      throw error;
    }
  },

  // Duplicate an existing laboratory with all categories, tests, and rates
  duplicateLab: async (sourceLabId, labData) => {
    try {
      const response = await api.post(`/lab-fees/labs/${sourceLabId}/duplicate`, labData);
      return response.data;
    } catch (error) {
      console.error('Error duplicating lab:', error);
      throw error;
    }
  },

  // Get service categories for a specific lab
  getCategories: async (labId) => {
    try {
      console.log('Making API request to:', `${API_BASE_URL}/lab-fees/categories/?lab_id=${labId}`);
      const response = await api.get(`/lab-fees/categories/?lab_id=${labId}`);
      console.log('Categories API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get tests for a specific category
  getTests: async (categoryId) => {
    try {
      console.log('Making API request to:', `${API_BASE_URL}/lab-fees/tests/?service_category_id=${categoryId}`);
      const response = await api.get(`/lab-fees/tests/?service_category_id=${categoryId}`);
      console.log('Tests API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching tests:', error);
      throw error;
    }
  },

  // Get rates for a specific test
  getRates: async (testId) => {
    try {
      console.log('Making API request to:', `${API_BASE_URL}/lab-fees/rates/?test_id=${testId}`);
      const response = await api.get(`/lab-fees/rates/?test_id=${testId}`);
      console.log('Rates API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching rates:', error);
      throw error;
    }
  },

  // Get all lab fees data (categories, tests, rates) for a specific lab
  getLabFees: async (labId) => {
    try {
      console.log('Making API request for lab:', labId);

      // Get categories for the lab
      const categories = await labFeesAPI.getCategories(labId);

      // For each category, get tests and their rates
      const categoriesWithTests = await Promise.all(
        categories.map(async (category) => {
          const tests = await labFeesAPI.getTests(category.id);

          // For each test, get rates
          const testsWithRates = await Promise.all(
            tests.map(async (test) => {
              const rates = await labFeesAPI.getRates(test.id);
              return {
                ...test,
                rates: rates.map(rate => ({
                  ...rate,
                  turn_time: rate.turn_time.label,
                  hours: rate.turn_time.hours
                }))
              };
            })
          );

          return {
            ...category,
            tests: testsWithRates
          };
        })
      );

      return {
        categories: categoriesWithTests
      };
    } catch (error) {
      console.error('Error fetching lab fees:', error);
      throw error;
    }
  },

  // Seed sample data
  seedData: async () => {
    try {
      console.log('Making API request to:', `${API_BASE_URL}/lab-fees/seed`);
      const response = await api.post('/lab-fees/seed');
      console.log('Seed API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error seeding data:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Create new category
  createCategory: async (categoryData, labId) => {
    try {
      console.log('Creating category:', categoryData, 'for lab:', labId);
      const response = await api.post('/lab-fees/categories/', {
        ...categoryData,
        lab_id: labId
      });
      console.log('Create category response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    try {
      console.log('Deleting category:', categoryId);
      const response = await api.delete(`/lab-fees/categories/${categoryId}`);
      console.log('Delete category response:', response);
      return response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Create new test
  createTest: async (testData, categoryId) => {
    try {
      console.log('Creating test:', testData, 'in category:', categoryId);
      const response = await api.post('/lab-fees/tests/', {
        ...testData,
        service_category_id: categoryId
      });
      console.log('Create test response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating test:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Delete test
  deleteTest: async (testId) => {
    try {
      console.log('Deleting test:', testId);
      const response = await api.delete(`/lab-fees/tests/${testId}`);
      console.log('Delete test response:', response);
      return response.data;
    } catch (error) {
      console.error('Error deleting test:', error);
      throw error;
    }
  },

  // Get turnaround times
  getTurnTimes: async () => {
    try {
      console.log('Fetching turnaround times');
      const response = await api.get('/lab-fees/turn_times/');
      console.log('Get turn times response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching turn times:', error);
      throw error;
    }
  },

  // Create new rate
  createRate: async (rateData) => {
    try {
      console.log('Creating rate:', rateData);
      const response = await api.post('/lab-fees/rates/', rateData);
      console.log('Create rate response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating rate:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Get labor rates for staff role selection
  getLaborRates: async () => {
    try {
      console.log('Fetching labor rates');
      const response = await api.get('/lab-fees/labor-rates');
      console.log('Get labor rates response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      throw error;
    }
  },

  // Create lab fees order with staff assignments
  createOrder: async (orderData) => {
    try {
      console.log('Creating lab fees order:', orderData);
      const response = await api.post('/lab-fees/orders/', orderData);
      console.log('Create order response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Get lab fees orders
  getOrders: async (projectName, hrsEstimationId) => {
    try {
      const params = new URLSearchParams();
      if (projectName) params.append('project_name', projectName);
      if (hrsEstimationId) params.append('hrs_estimation_id', hrsEstimationId);

      const url = `/lab-fees/orders/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },
};

export const hrsEstimatorAPI = {
  // Create new estimation
  createEstimation: async (estimationData) => {
    try {
      console.log('Creating estimation:', estimationData);
      const response = await api.post('/hrs-estimator/estimate', estimationData);
      console.log('Create estimation response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating estimation:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Get estimation by ID
  getEstimation: async (id) => {
    try {
      console.log('Fetching estimation:', id);
      const response = await api.get(`/hrs-estimator/estimate/${id}`);
      console.log('Get estimation response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching estimation:', error);
      throw error;
    }
  },

  // Get all estimations
  getEstimations: async () => {
    try {
      console.log('Fetching all estimations');
      const response = await api.get('/hrs-estimator/estimates');
      console.log('Get estimations response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching estimations:', error);
      throw error;
    }
  },

  // Get labor rates for professional role selection
  getLaborRates: async () => {
    try {
      console.log('Fetching labor rates');
      const response = await api.get('/hrs-estimator/labor-rates');
      console.log('Get labor rates response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      throw error;
    }
  },

  // Seed reference data
  seedData: async () => {
    try {
      console.log('Seeding HRS Estimator data');
      const response = await api.post('/hrs-estimator/seed');
      console.log('Seed API response:', response);
      return response.data;
    } catch (error) {
      console.error('Error seeding data:', error);
      throw error;
    }
  },
};

export const logisticsAPI = {
  // Create new logistics estimation
  createEstimation: async (estimationData) => {
    try {
      console.log('Creating logistics estimation:', estimationData);
      const response = await api.post('/logistics/estimate', estimationData);
      console.log('Create logistics estimation response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating logistics estimation:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  // Get estimation by ID
  getEstimation: async (id) => {
    try {
      console.log('Fetching logistics estimation:', id);
      const response = await api.get(`/logistics/estimate/${id}`);
      console.log('Get logistics estimation response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching logistics estimation:', error);
      throw error;
    }
  },

  // Get all estimations
  getEstimations: async () => {
    try {
      console.log('Fetching all logistics estimations');
      const response = await api.get('/logistics/estimates');
      console.log('Get logistics estimations response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching logistics estimations:', error);
      throw error;
    }
  },

  // Get labor rates for professional role selection
  getLaborRates: async () => {
    try {
      console.log('Fetching labor rates');
      const response = await api.get('/logistics/labor-rates');
      console.log('Get labor rates response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      throw error;
    }
  },
};

export const projectAPI = {
  // List all projects
  listProjects: async (status = null) => {
    try {
      const url = status ? `/projects/?status=${status}` : '/projects/';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error listing projects:', error);
      throw error;
    }
  },

  // Get project by ID
  getProject: async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  },

  // Get project by name
  getProjectByName: async (projectName) => {
    try {
      const response = await api.get(`/projects/by-name/${encodeURIComponent(projectName)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project by name:', error);
      throw error;
    }
  },

  // Create new project
  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects/', projectData);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    try {
      const response = await api.put(`/projects/${projectId}`, projectData);
      return response.data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  // Delete project (deletes project and all associated data)
  deleteProject: async (projectId) => {
    try {
      const response = await api.delete(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },
};

export const projectSummaryAPI = {
  // Get project estimate summary
  getEstimateSummary: async (projectName) => {
    try {
      console.log('Fetching project estimate summary for:', projectName);
      const response = await api.get(`/projects/${encodeURIComponent(projectName)}/estimate-summary`);
      console.log('Get estimate summary response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching estimate summary:', error);
      throw error;
    }
  },
};

export const estimateSnapshotAPI = {
  // Get latest (active) snapshot for a project
  getLatestSnapshot: async (projectName) => {
    try {
      console.log('Fetching latest snapshot for:', projectName);
      const response = await api.get(`/projects/${encodeURIComponent(projectName)}/snapshot/latest`);
      console.log('Get latest snapshot response:', response);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // No snapshot exists yet - this is OK
        return null;
      }
      console.error('Error fetching latest snapshot:', error);
      throw error;
    }
  },

  // List all snapshots for a project
  listSnapshots: async (projectName) => {
    try {
      console.log('Fetching snapshots for:', projectName);
      const response = await api.get(`/projects/${encodeURIComponent(projectName)}/snapshots`);
      console.log('List snapshots response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      throw error;
    }
  },

  // Get global estimate history (all projects with snapshots)
  getGlobalHistory: async () => {
    try {
      console.log('Fetching global estimate history');
      const response = await api.get('/snapshots/global');
      console.log('Global history response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching global history:', error);
      throw error;
    }
  },

  // Get specific snapshot by ID
  getSnapshot: async (snapshotId) => {
    try {
      console.log('Fetching snapshot:', snapshotId);
      const response = await api.get(`/snapshots/${snapshotId}`);
      console.log('Get snapshot response:', response);
      return response.data;
    } catch (error) {
      console.error('Error fetching snapshot:', error);
      throw error;
    }
  },

  // Duplicate active snapshot to create new one
  duplicateSnapshot: async (projectName, snapshotName = null) => {
    try {
      console.log('Duplicating snapshot for:', projectName);
      const response = await api.post(`/projects/${encodeURIComponent(projectName)}/snapshots/duplicate`, {
        snapshot_name: snapshotName
      });
      console.log('Duplicate snapshot response:', response);
      return response.data;
    } catch (error) {
      console.error('Error duplicating snapshot:', error);
      throw error;
    }
  },

  // Save & Close Project: Commit current project state
  saveAndCloseProject: async (projectName) => {
    try {
      console.log('Saving and closing project:', projectName);
      const response = await api.post(`/projects/${encodeURIComponent(projectName)}/snapshot/save-and-close`);
      console.log('Save and close response:', response);
      return response.data;
    } catch (error) {
      console.error('Error saving and closing project:', error);
      throw error;
    }
  },

  // Discard Project: Delete all snapshots and summaries for a project
  discardProject: async (projectName) => {
    try {
      console.log('Discarding project:', projectName);
      const response = await api.delete(`/projects/${encodeURIComponent(projectName)}/discard`);
      console.log('Discard project response:', response);
      return response.data;
    } catch (error) {
      console.error('Error discarding project:', error);
      throw error;
    }
  },

  // Delete a specific snapshot
  deleteSnapshot: async (snapshotId) => {
    try {
      console.log('Deleting snapshot:', snapshotId);
      const response = await api.delete(`/snapshots/${snapshotId}`);
      console.log('Delete snapshot response:', response);
      return response.data;
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      throw error;
    }
  },
};

// User Management API (Admin only)
export const userManagementAPI = {
  // Get all users
  listUsers: async (token) => {
    try {
      const response = await api.get('/users/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  },

  // Create new user
  createUser: async (userData, token) => {
    try {
      const response = await api.post('/users/', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId, token) => {
    try {
      const response = await api.delete(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Get all labor rates (staff titles & billing rates)
  getLaborRates: async () => {
    try {
      const response = await api.get('/hrs-estimator/labor-rates');
      return response.data;
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      throw error;
    }
  },

  // Create a new labor rate
  createLaborRate: async (rateData) => {
    try {
      const response = await api.post('/hrs-estimator/labor-rates', rateData);
      return response.data;
    } catch (error) {
      console.error('Error creating labor rate:', error);
      throw error;
    }
  },

  // Update an existing labor rate
  updateLaborRate: async (rateId, rateData) => {
    try {
      const response = await api.put(`/hrs-estimator/labor-rates/${rateId}`, rateData);
      return response.data;
    } catch (error) {
      console.error('Error updating labor rate:', error);
      throw error;
    }
  },

  // Delete a labor rate
  deleteLaborRate: async (rateId) => {
    try {
      const response = await api.delete(`/hrs-estimator/labor-rates/${rateId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting labor rate:', error);
      throw error;
    }
  },
};

// Authentication API
export const authAPI = {
  // Sign in
  signin: async ({ email, password }) => {
    try {
      // Backend expects JSON body with email and password
      const response = await api.post('/auth/signin', { email, password });
      return response.data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Log out (clears local storage)
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  // Get current user role
  getRole: () => {
    return localStorage.getItem('user_role') || 'user';
  }
};

export default api;
