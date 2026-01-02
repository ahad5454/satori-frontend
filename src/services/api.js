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

export default api;
