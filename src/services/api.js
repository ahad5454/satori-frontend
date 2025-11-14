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

export default api;
