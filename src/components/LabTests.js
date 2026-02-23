import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { labFeesAPI, estimateSnapshotAPI } from '../services/api';
import ProjectHeader from './ProjectHeader';
import LabFeesBreakdownDetails from './LabFeesBreakdownDetails';
import './LabTests.css';

/**
 * HRS to Lab Fees mapping (must match backend HRS_TO_LAB_MAPPING)
 * 
 * DATA CONTRACT: Each mapping entry explicitly defines:
 * - hrs_output_key: The HRS output field name (e.g., "total_plm")
 * - service_category: The Lab Fees service category name
 * - test_name: The Lab Fees test name
 * - turnaround: The turnaround time label
 * 
 * This is a data contract, not a naming convention. The hrs_output_key
 * is explicitly defined to avoid brittle assumptions about key names.
 */
const HRS_TO_LAB_MAPPING = {
  "asbestos": {
    "hrs_output_key": "total_plm",
    "service_category": "PLM - Bulk Building Materials",
    "test_name": "EPA/600/R-93/116 (<1%)",
    "turnaround": "24 hr"
  },
  "lead_chips_wipes": {
    "hrs_output_key": "total_chips_wipes",
    "service_category": "Lead Laboratory Services",
    "test_name": "Paint Chips (SW-846-7000B)",
    "turnaround": "24 hr"
  },
  "mold_tape_lift": {
    "hrs_output_key": "total_tape_lift",
    "service_category": "Mold Related Services - EMLab P&K",
    "test_name": "Direct Microscopic Examination",
    "turnaround": "Standard"
  },
  "mold_spore_trap": {
    "hrs_output_key": "total_spore_trap",
    "service_category": "Mold Related Services - EMLab P&K",
    "test_name": "Spore Trap Analysis",
    "turnaround": "Standard"
  },
  "mold_culturable": {
    "hrs_output_key": "total_culturable",
    "service_category": "Mold Related Services - EMLab P&K",
    "test_name": "Culturable air fungi speciation",
    "turnaround": "Standard"
  }
  // Note: "lead_xrf" is intentionally omitted here as it has empty service_category
  // and test_name. It represents field analysis, not a lab test, so it should not
  // appear in Lab Fees.
};

const LabTests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { project, handleProjectNotFound } = useProject();
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null); // Currently selected laboratory
  const [categories, setCategories] = useState([]); // Categories for selected lab
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [quantities, setQuantities] = useState({}); // Track quantities for each test
  const [selectedTurnTime, setSelectedTurnTime] = useState(null); // Track selected turnaround time
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [newLab, setNewLab] = useState({ name: '', address: '', contact_info: '' });
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTest, setNewTest] = useState({ name: '', description: '', category: '', pricing: [] });
  const [currentTestPricing, setCurrentTestPricing] = useState([]);
  const [turnTimes, setTurnTimes] = useState([]);

  // Staff assignments state
  const [laborRates, setLaborRates] = useState([]);
  const [staffRows, setStaffRows] = useState([{ role: '', count: 1, hours_per_person: 0 }]);
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [hrsEstimationId, setHrsEstimationId] = useState(null);

  // HRS import state (explicit, user-driven model)
  const [hrsDataAvailable, setHrsDataAvailable] = useState(false);
  const [hrsDataChanged, setHrsDataChanged] = useState(false);
  const [importedHrsSnapshotId, setImportedHrsSnapshotId] = useState(null); // Track which HRS snapshot was imported
  // CRITICAL: Row-level locking - track which specific quantity keys are derived from HRS
  // This allows manual entry of additional tests while keeping HRS-derived rows read-only
  // Format: Set of quantity keys (e.g., "EPA/600/R-93/116 (<1%)-24 hr") that are derived
  const [derivedQuantityKeys, setDerivedQuantityKeys] = useState(new Set()); // Track which specific rows are derived

  // Breakdown display state
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Cross-lab cart state
  // Each item: { id, labId, labName, testId, testName, categoryName, turnTime, turnTimeHours, price, quantity }
  const [cart, setCart] = useState([]);

  // Add test to cart (or increment if already exists)
  const addToCart = (test, rate, category) => {
    const turnTimeStr = typeof rate.turn_time === 'string' ? rate.turn_time : rate.turn_time?.label || 'unknown';
    const existingIndex = cart.findIndex(
      item => item.testId === test.id && item.turnTime === turnTimeStr && item.labId === selectedLab?.id
    );

    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...cart];
      updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
      setCart(updated);
    } else {
      setCart([...cart, {
        id: `${selectedLab?.id}-${test.id}-${turnTimeStr}-${Date.now()}`,
        labId: selectedLab?.id,
        labName: selectedLab?.name || 'Unknown Lab',
        testId: test.id,
        testName: test.name,
        categoryName: category?.name || selectedCategory?.name || '',
        turnTime: turnTimeStr,
        turnTimeHours: rate.hours,
        price: rate.price,
        quantity: 1,
      }]);
    }
  };

  const removeFromCart = (cartItemId) => {
    setCart(cart.filter(item => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(cart.map(item =>
      item.id === cartItemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Calculate cart totals
  const getCartTotals = () => {
    let totalSamples = 0;
    let totalCost = 0;
    cart.forEach(item => {
      totalSamples += item.quantity;
      totalCost += item.quantity * item.price;
    });
    return { totalSamples, totalCost };
  };

  // Group cart by lab
  const getCartGroupedByLab = () => {
    const grouped = {};
    cart.forEach(item => {
      if (!grouped[item.labName]) {
        grouped[item.labName] = [];
      }
      grouped[item.labName].push(item);
    });
    return grouped;
  };

  /**
   * Generic, mapping-driven derivation of Lab Fees quantities from HRS outputs.
   * 
   * This function iterates over HRS_TO_LAB_MAPPING (not hardcoded cases) and:
   * 1. For each mapping entry, uses the explicit hrs_output_key to get the HRS total value
   * 2. If HRS total exists, is a number, and > 0:
   *    - Validates mapping has required fields (service_category, test_name, turnaround)
   *    - Selects the mapped service_category, test_name, and turnaround
   *    - Sets quantity equal to HRS total
   *    - Marks as derived (read-only)
   * 
   * IDEMPOTENCY: This function returns a complete set of derived quantities.
   * The caller must clear and rebuild all quantities (no merging) to ensure consistency.
   * 
   * This is the ONLY way quantities should be set - from HRS data, never from defaults.
   * Future mappings added to HRS_TO_LAB_MAPPING will work automatically without code changes.
   * 
   * @param {Object} hrsOutputs - HRS estimator outputs containing total_plm, total_chips_wipes, etc.
   * @param {Array} categories - Lab Fees categories with tests and rates
   * @returns {Object} Derived quantities object with keys like "Test Name-Turnaround": quantity
   */
  const deriveLabFeesFromHRS = (hrsOutputs, categories) => {
    if (!hrsOutputs || !categories || categories.length === 0) {
      return {};
    }

    const derivedQuantities = {};

    // GENERIC RULE: Iterate over HRS_TO_LAB_MAPPING (not hardcoded cases)
    // This ensures future mappings work automatically without code changes
    Object.entries(HRS_TO_LAB_MAPPING).forEach(([mappingKey, mapping]) => {
      // Skip entries with empty service_category or test_name
      // Example: "lead_xrf" has empty fields and represents field analysis, not a lab test
      if (!mapping.service_category || !mapping.test_name || !mapping.turnaround) {
        // Intentionally skipped - this mapping does not represent a lab test
        return;
      }

      // Use explicit hrs_output_key (data contract, not derived from key name)
      const hrsOutputKey = mapping.hrs_output_key;
      if (!hrsOutputKey) {
        console.warn(`Mapping "${mappingKey}" missing hrs_output_key field`);
        return;
      }

      // Get the HRS total value using the explicit key
      const hrsValue = hrsOutputs[hrsOutputKey];

      // GENERIC RULE: If HRS total exists, is a number, and > 0, derive Lab Fees
      if (hrsValue !== null && hrsValue !== undefined && typeof hrsValue === 'number' && hrsValue > 0) {
        // Find the matching test in categories using mapped service_category and test_name
        categories.forEach(category => {
          if (category.name === mapping.service_category && category.tests) {
            category.tests.forEach(test => {
              if (test.name === mapping.test_name && test.rates) {
                // Find the rate with matching turnaround time
                test.rates.forEach(rate => {
                  const rateTurnTime = typeof rate.turn_time === 'string'
                    ? rate.turn_time
                    : rate.turn_time?.label || '';

                  if (rateTurnTime === mapping.turnaround) {
                    // Set quantity equal to HRS total (idempotent: same key = same value)
                    const key = `${test.name}-${rateTurnTime}`;
                    derivedQuantities[key] = hrsValue;
                  }
                });
              }
            });
          }
        });
      }
    });

    return derivedQuantities;
  };

  /**
   * Check if HRS data is available for the active project.
   * This is used to show the "Import HRS Sample Data" button.
   * 
   * DESIGN DECISION: This is explicit, user-driven import model.
   * We detect HRS availability but do NOT auto-derive.
   */
  const checkHrsDataAvailability = useCallback(async () => {
    if (!project || !project.name) {
      setHrsDataAvailable(false);
      setHrsDataChanged(false);
      return;
    }

    try {
      const snapshot = await estimateSnapshotAPI.getLatestSnapshot(project.name);
      if (!snapshot || !snapshot.hrs_estimator_data || !snapshot.hrs_estimator_data.outputs) {
        setHrsDataAvailable(false);
        setHrsDataChanged(false);
        return;
      }

      const hrsOutputs = snapshot.hrs_estimator_data.outputs;
      // Check if any HRS output has a value > 0 (using mapping to check relevant fields)
      let hasData = false;
      Object.entries(HRS_TO_LAB_MAPPING).forEach(([mappingKey, mapping]) => {
        if (!mapping.service_category || !mapping.test_name) return;
        const hrsOutputKey = mapping.hrs_output_key;
        if (hrsOutputKey && hrsOutputs[hrsOutputKey] && hrsOutputs[hrsOutputKey] > 0) {
          hasData = true;
        }
      });

      setHrsDataAvailable(hasData);

      // Check if HRS data has changed since last import
      if (importedHrsSnapshotId && snapshot.id !== importedHrsSnapshotId && derivedQuantityKeys.size > 0) {
        setHrsDataChanged(true);
      } else {
        setHrsDataChanged(false);
      }
    } catch (error) {
      console.error('Error checking HRS data availability:', error);
      if (error.response?.status === 404) {
        handleProjectNotFound();
      }
      setHrsDataAvailable(false);
      setHrsDataChanged(false);
    }
  }, [project, importedHrsSnapshotId, derivedQuantityKeys.size, handleProjectNotFound]);

  /**
   * Explicit, user-driven import of HRS sample data into Lab Fees.
   * 
   * DESIGN DECISION: This is the ONLY way quantities should be set from HRS.
   * No automatic derivation - user must explicitly click "Import HRS Sample Data".
   * 
   * This function:
   * 1. Derives Lab Fees quantities using HRS_TO_LAB_MAPPING
   * 2. For each mapping entry, uses explicit hrs_output_key
   * 3. If HRS output value exists and > 0, sets quantity = HRS output value
   * 4. Clears and rebuilds all derived quantities (idempotent)
   * 5. Marks quantities as derived (read-only)
   */
  const handleImportHrsData = async () => {
    if (!project?.name || !categories || categories.length === 0) {
      alert('Please ensure a project is selected and categories are loaded.');
      return;
    }

    try {
      const snapshot = await estimateSnapshotAPI.getLatestSnapshot(project.name);
      if (!snapshot || !snapshot.hrs_estimator_data || !snapshot.hrs_estimator_data.outputs) {
        alert('No HRS sample data available for this project.');
        return;
      }

      const hrsOutputs = snapshot.hrs_estimator_data.outputs;
      const derivedQuantities = deriveLabFeesFromHRS(hrsOutputs, categories);

      // CRITICAL: Derived quantities are REAL order items, not display-only
      // They are stored in the canonical quantities collection (same as manual entries)
      // This ensures they are included in:
      // - Order Summary aggregation
      // - Save/submit logic
      // - Snapshot persistence
      // ROW-LEVEL LOCKING: Only the specific rows derived from HRS are read-only
      // Manual rows can be added/edited normally - they coexist with derived rows
      // IDEMPOTENT: Clear and rebuild all derived quantities
      // This ensures quantities always match HRS outputs exactly
      console.log('Importing HRS sample data into Lab Fees (explicit user action, mapping-driven):', derivedQuantities);
      console.log('Derived quantities will be added to canonical order items collection:', Object.keys(derivedQuantities).length, 'items');

      // Merge derived quantities with existing manual quantities (don't overwrite manual entries)
      setQuantities(prev => {
        const merged = { ...prev };
        Object.entries(derivedQuantities).forEach(([key, value]) => {
          merged[key] = value; // Derived quantities override any existing values for these keys
        });
        return merged;
      });

      // Track which keys are derived (for row-level locking)
      setDerivedQuantityKeys(new Set(Object.keys(derivedQuantities)));
      setImportedHrsSnapshotId(snapshot.id);
      setHrsDataChanged(false);

      // Show success message
      if (Object.keys(derivedQuantities).length > 0) {
        alert(`Successfully imported ${Object.keys(derivedQuantities).length} test quantity(ies) from HRS Sample Estimator.`);
      } else {
        alert('No quantities to import. HRS outputs are all zero.');
      }
    } catch (error) {
      console.error('Error importing HRS data:', error);
      alert('Failed to import HRS sample data. Please try again.');
    }
  };

  // Load snapshot data when project name is available (for form rehydration)
  // DESIGN DECISION: Explicit, user-driven import model
  // - Rehydrate form structure (lab, categories, tests) from snapshot.inputs
  // - Rehydrate staff assignments from snapshot.inputs
  // - Do NOT auto-derive quantities - user must explicitly click "Import HRS Sample Data"
  // - Check HRS data availability to show import button
  useEffect(() => {
    // Only run if we're actually on the Lab Fees route
    if (location.pathname !== '/lab-fees') {
      return;
    }

    const loadSnapshotData = async () => {
      if (project?.name) {
        try {
          const snapshot = await estimateSnapshotAPI.getLatestSnapshot(project.name);
          if (snapshot) {
            // Rehydrate staff assignments from saved Lab Fees data (separate from quantities)
            if (snapshot.lab_fees_data && snapshot.lab_fees_data.inputs) {
              const inputs = snapshot.lab_fees_data.inputs;

              if (inputs.staff_assignments && Array.isArray(inputs.staff_assignments) && inputs.staff_assignments.length > 0) {
                setStaffRows(inputs.staff_assignments.map(s => ({
                  role: s.role || '',
                  count: s.count || 1,
                  hours_per_person: s.hours_per_person || 0
                })));
                setShowStaffSection(true);
              }

              // Rehydrate HRS estimation ID if present
              if (inputs.hrs_estimation_id) {
                setHrsEstimationId(inputs.hrs_estimation_id);
              }

              // Rehydrate quantities from saved order_details
              // CRITICAL: Only use snapshot.inputs for rehydration - never use snapshot.outputs.hrs_estimator
              // HRS outputs are ONLY used when user explicitly clicks "Import HRS Sample Data"
              // order_details format: { testId: { turnTimeId: quantity } }
              // quantities format: { "testName-turnTime": quantity }
              // We need to convert order_details back to quantities format
              if (inputs.order_details && Object.keys(inputs.order_details).length > 0 && categories.length > 0) {
                const rehydratedQuantities = {};

                // Convert order_details (testId -> turnTimeId -> quantity) to quantities (testName-turnTime -> quantity)
                Object.entries(inputs.order_details).forEach(([testId, turnTimeMap]) => {
                  // Find the test by ID
                  let foundTest = null;
                  for (const category of categories) {
                    if (category.tests) {
                      foundTest = category.tests.find(t => t.id.toString() === testId);
                      if (foundTest) break;
                    }
                  }

                  if (foundTest) {
                    // For each turnTime in the map
                    Object.entries(turnTimeMap).forEach(([turnTimeId, quantity]) => {
                      // Find the rate with this turnTimeId to get the turnTime label
                      if (foundTest.rates) {
                        const rate = foundTest.rates.find(r => {
                          const rateTurnTimeId = r.turn_time_id?.toString() || '';
                          return rateTurnTimeId === turnTimeId || turnTimeId === '';
                        });

                        if (rate) {
                          const turnTimeStr = typeof rate.turn_time === 'string'
                            ? rate.turn_time
                            : rate.turn_time?.label || 'unknown';
                          const key = `${foundTest.name}-${turnTimeStr}`;
                          rehydratedQuantities[key] = quantity;
                        }
                      }
                    });
                  }
                });

                // Rehydrate quantities from snapshot.inputs only
                // Check import metadata stored in inputs (not HRS outputs)
                const wasImported = inputs.quantities_imported_from_hrs === true;
                const savedSnapshotId = inputs.imported_hrs_snapshot_id;

                if (wasImported && savedSnapshotId) {
                  // Quantities were imported from HRS - restore with import metadata
                  // ROW-LEVEL LOCKING: Track which specific keys are derived
                  setQuantities(rehydratedQuantities);
                  setDerivedQuantityKeys(new Set(Object.keys(rehydratedQuantities)));
                  setImportedHrsSnapshotId(savedSnapshotId);
                } else {
                  // Quantities were manually entered (not imported)
                  setQuantities(rehydratedQuantities);
                  setDerivedQuantityKeys(new Set()); // No derived rows
                  setImportedHrsSnapshotId(null);
                }
              } else {
                // No saved quantities - start empty
                setQuantities({});
                setDerivedQuantityKeys(new Set());
                setImportedHrsSnapshotId(null);
              }
            }

            // Check HRS data availability (for showing import button)
            // This does NOT auto-derive - it only checks availability
            await checkHrsDataAvailability();
          } else {
            // No snapshot - reset state
            setHrsDataAvailable(false);
            setHrsDataChanged(false);
          }
        } catch (error) {
          console.error('Error loading Lab Fees snapshot data:', error);
        }
      } else {
        // No project - reset everything
        setQuantities({});
        setStaffRows([{ role: '', count: 1, hours_per_person: 0 }]);
        setShowStaffSection(false);
        setHrsEstimationId(null);
        setHrsDataAvailable(false);
        setHrsDataChanged(false);
        setDerivedQuantityKeys(new Set());
        setImportedHrsSnapshotId(null);
      }
    };

    loadSnapshotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, categories, location.pathname, checkHrsDataAvailability]); // location.pathname triggers on route change

  const fetchLabs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching laboratories...');

      // Fetch all laboratories
      const labsData = await labFeesAPI.getLabs();
      console.log('Received labs:', labsData);
      setLabs(labsData);

      // Select first lab if available
      if (labsData.length > 0) {
        setSelectedLab(labsData[0]);
      }
    } catch (err) {
      console.error('Error fetching laboratories:', err);
      setError(`Failed to load laboratories: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();

    // Fetch labor rates and turn times on mount
    const fetchReferenceData = async () => {
      try {
        const rates = await labFeesAPI.getLaborRates();
        console.log('Labor rates fetched:', rates);
        setLaborRates(rates);

        const turnTimesData = await labFeesAPI.getTurnTimes();
        console.log('Turn times fetched:', turnTimesData);
        setTurnTimes(turnTimesData);
      } catch (err) {
        console.error('Error fetching reference data:', err);
      }
    };
    fetchReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for HRS estimation completion
  // DESIGN DECISION: Explicit import model - do NOT auto-derive
  // When HRS estimation completes, check availability and show import button
  // Do NOT automatically import - user must explicitly click the button
  useEffect(() => {
    const handleHrsEstimationComplete = async (event) => {
      console.log('HRS Estimation completed:', event.detail);
      if (event.detail?.estimationId) {
        setHrsEstimationId(event.detail.estimationId);
        setShowStaffSection(true); // Show staff section when HRS estimation is done

        // Check HRS data availability (for showing import button)
        // Do NOT auto-derive - user must explicitly import
        await checkHrsDataAvailability();
      }
      if (selectedLab) {
        fetchCategoriesForLab(selectedLab.id);
      }
    };

    window.addEventListener('hrs-estimation-complete', handleHrsEstimationComplete);

    return () => {
      window.removeEventListener('hrs-estimation-complete', handleHrsEstimationComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLab, project, checkHrsDataAvailability]);


  // Fetch categories when lab is selected
  useEffect(() => {
    if (selectedLab) {
      fetchCategoriesForLab(selectedLab.id);
    }
  }, [selectedLab]);

  const fetchCategoriesForLab = async (labId) => {
    try {
      console.log('Fetching categories for lab:', labId);
      const categoriesData = await labFeesAPI.getCategories(labId);

      // Fetch tests for each category
      const categoriesWithTests = await Promise.all(
        categoriesData.map(async (category) => {
          const tests = await labFeesAPI.getTests(category.id);

          // Fetch rates for each test
          const testsWithRates = await Promise.all(
            tests.map(async (test) => {
              const rates = await labFeesAPI.getRates(test.id);
              return {
                ...test,
                rates: rates.map(rate => ({
                  ...rate,
                  turn_time: rate.turn_time.label,
                  hours: rate.turn_time.hours,
                  sample_count: null // Never use sample_count from API - quantities come from HRS outputs only
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

      console.log('Categories with tests:', categoriesWithTests);
      setCategories(categoriesWithTests);

      // Select first category if available
      if (categoriesWithTests.length > 0) {
        setSelectedCategory(categoriesWithTests[0]);
        if (categoriesWithTests[0].tests && categoriesWithTests[0].tests.length > 0) {
          setSelectedTest(categoriesWithTests[0].tests[0]);
        }
      } else {
        setSelectedCategory(null);
        setSelectedTest(null);
      }

      // After categories load, check HRS data availability (for showing import button)
      // DESIGN DECISION: Explicit import model - do NOT auto-derive
      // We only check availability, user must explicitly click "Import HRS Sample Data"
      if (project && project.name && categoriesWithTests.length > 0) {
        checkHrsDataAvailability();
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(`Failed to load categories: ${err.message || err.toString()}`);
    }
  };

  const handleLabChange = async (lab) => {
    setSelectedLab(lab);
    setSelectedCategory(null);
    setSelectedTest(null);
    // ROW-LEVEL LOCKING: Only clear quantities for non-derived rows
    // Preserve derived quantities (they're read-only anyway)
    setQuantities(prev => {
      const filtered = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (derivedQuantityKeys.has(key)) {
          // Preserve derived quantities
          filtered[key] = value;
        }
        // Non-derived quantities are cleared when changing lab
      });
      return filtered;
    });
    setSelectedTurnTime(null);
  };

  const handleSeedData = async () => {
    try {
      await labFeesAPI.seedData();
      await fetchLabs(); // Refresh laboratories
      if (selectedLab) {
        await fetchCategoriesForLab(selectedLab.id);
      }
    } catch (err) {
      setError('Failed to seed data. Please try again.');
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedTest(null);
    // ROW-LEVEL LOCKING: Only clear quantities for non-derived rows
    // Preserve derived quantities (they're read-only anyway)
    setQuantities(prev => {
      const filtered = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (derivedQuantityKeys.has(key)) {
          // Preserve derived quantities
          filtered[key] = value;
        }
        // Non-derived quantities are cleared when changing category
      });
      return filtered;
    });
    setSelectedTurnTime(null);

    // If category has tests, select the first one
    if (category.tests && category.tests.length > 0) {
      setSelectedTest(category.tests[0]);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getTurnTimeColor = (hours) => {
    if (hours <= 6) return '#e74c3c'; // Red for urgent
    if (hours <= 24) return '#f39c12'; // Orange for same day
    if (hours <= 72) return '#f1c40f'; // Yellow for 2-3 days
    return '#27ae60'; // Green for standard
  };

  const handleQuantityChange = (testName, turnTime, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    const key = `${testName}-${turnTime}`;
    setQuantities(prev => ({
      ...prev,
      [key]: numQuantity
    }));
  };


  // Calculate totals from quantities (derived from HRS outputs or manually entered)
  // CRITICAL: quantities is the canonical order items collection
  // Derived rows from HRS import are real order items, not display-only
  // They are stored in quantities state just like manual entries
  // The only difference is derivedQuantityKeys Set (for row-level locking) and read-only quantity inputs
  // NOTE: Do NOT use rate.sample_count - quantities are the source of truth
  const calculateOrderSummary = () => {
    let totalSamples = 0;
    let totalCost = 0;
    const breakdown = [];

    // CRITICAL: Sum ALL quantities in the canonical collection
    // No special-case filtering - derived and manual items are treated identically
    // This ensures Order Summary reflects the true total cost
    Object.entries(quantities).forEach(([key, quantity]) => {
      if (quantity > 0) {
        // Split key: format is "testName-turnTime"
        // Use lastIndexOf to handle test names that might contain hyphens
        const lastDashIndex = key.lastIndexOf('-');
        if (lastDashIndex === -1) {
          console.warn(`Order Summary: Invalid quantity key format: "${key}"`);
          return;
        }
        const testName = key.substring(0, lastDashIndex);
        const turnTime = key.substring(lastDashIndex + 1);

        // Search across ALL categories to find the test
        // Derived quantities may be in different categories than selectedCategory
        let found = false;
        for (const category of categories) {
          if (category.tests) {
            for (const test of category.tests) {
              if (test.name === testName && test.rates) {
                for (const rate of test.rates) {
                  const rateTurnTime = typeof rate.turn_time === 'string'
                    ? rate.turn_time
                    : rate.turn_time?.label || 'unknown';

                  if (rateTurnTime === turnTime) {
                    const rateCost = quantity * (rate.price || 0);
                    totalSamples += quantity;
                    totalCost += rateCost;

                    breakdown.push({
                      categoryName: category.name,
                      testName: test.name,
                      turnTime: turnTime,
                      sampleCount: quantity,
                      price: rate.price || 0,
                      cost: rateCost
                    });
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            }
            if (found) break;
          }
        }

        // Log warning if quantity exists but test/rate not found (debugging)
        if (!found && categories.length > 0) {
          console.warn(`Order Summary: Could not find test/rate for "${testName}" / "${turnTime}". Available categories:`,
            categories.map(c => c.name).join(', '));
        }
      }
    });

    return { totalSamples, totalCost, breakdown };
  };

  const getQuantityForTurnaround = (testName, turnTime) => {
    // Ensure turnTime is a string
    const turnTimeStr = typeof turnTime === 'string' ? turnTime : turnTime?.label || 'unknown';
    const key = `${testName}-${turnTimeStr}`;
    return quantities[key] || 0;
  };

  // Staff management functions
  const handleAddStaffRow = () => {
    setStaffRows([...staffRows, { role: '', count: 1, hours_per_person: 0 }]);
  };

  const handleRemoveStaffRow = (index) => {
    const newRows = staffRows.filter((_, i) => i !== index);
    setStaffRows(newRows.length > 0 ? newRows : [{ role: '', count: 1, hours_per_person: 0 }]);
  };

  const handleStaffRoleChange = (index, role) => {
    const newRows = [...staffRows];
    newRows[index].role = role;
    setStaffRows(newRows);
  };

  const handleStaffCountChange = (index, count) => {
    const newRows = [...staffRows];
    newRows[index].count = Math.max(1, parseInt(count) || 1);
    setStaffRows(newRows);
  };

  const handleStaffHoursChange = (index, hours) => {
    const newRows = [...staffRows];
    newRows[index].hours_per_person = Math.max(0, parseFloat(hours) || 0);
    setStaffRows(newRows);
  };

  const getRoleRate = (role) => {
    const rateEntry = laborRates.find(r => r.labor_role === role);
    return rateEntry ? rateEntry.hourly_rate : null;
  };

  // Calculate staff labor costs
  const calculateStaffCosts = () => {
    let totalCost = 0;
    const breakdown = [];

    staffRows.forEach((row) => {
      if (row.role && row.count > 0 && row.hours_per_person > 0) {
        const rate = getRoleRate(row.role);
        if (rate) {
          const totalHours = row.count * row.hours_per_person;
          const cost = totalHours * rate;
          totalCost += cost;
          breakdown.push({
            role: row.role,
            count: row.count,
            hours_per_person: row.hours_per_person,
            total_hours: totalHours,
            hourly_rate: rate,
            cost: cost
          });
        }
      }
    });

    return { totalCost, breakdown };
  };

  // Save order with staff assignments
  const handleSaveOrder = async () => {
    try {
      calculateStaffCosts(); // Calculate to get staff costs

      // Build order details from cart (cross-lab) or quantities (legacy/HRS)
      const orderDetails = {};

      if (cart.length > 0) {
        // Cart-based: each item has testId, turnTime, quantity, labId
        cart.forEach(item => {
          const testId = item.testId.toString();
          // Use a composite key that includes lab info
          const key = `${testId}_lab${item.labId}`;
          if (!orderDetails[key]) {
            orderDetails[key] = {
              test_id: item.testId,
              lab_id: item.labId,
              lab_name: item.labName,
              test_name: item.testName,
              category_name: item.categoryName,
              turn_time: item.turnTime,
              quantity: item.quantity,
              price: item.price,
            };
          } else {
            orderDetails[key].quantity += item.quantity;
          }
        });
      } else {
        // Fallback: build from quantities (for HRS-derived data)
        Object.entries(quantities).forEach(([key, quantity]) => {
          if (quantity > 0) {
            const lastDashIndex = key.lastIndexOf('-');
            if (lastDashIndex === -1) return;
            const testName = key.substring(0, lastDashIndex);
            const turnTime = key.substring(lastDashIndex + 1);

            categories.forEach(category => {
              if (category.tests) {
                category.tests.forEach(test => {
                  if (test.name === testName && test.rates) {
                    test.rates.forEach(rate => {
                      const rateTurnTime = typeof rate.turn_time === 'string'
                        ? rate.turn_time
                        : rate.turn_time?.label || 'unknown';

                      if (rateTurnTime === turnTime) {
                        const testId = test.id.toString();
                        const turnTimeId = rate.turn_time_id?.toString() || '';

                        if (!orderDetails[testId]) {
                          orderDetails[testId] = {};
                        }
                        orderDetails[testId][turnTimeId] = quantity;
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Build staff assignments
      const staffAssignments = staffRows
        .filter(row => row.role && row.count > 0 && row.hours_per_person > 0)
        .map(row => ({
          role: row.role,
          count: row.count,
          hours_per_person: row.hours_per_person
        }));

      const { totalCost } = getCartTotals();
      const orderData = {
        project_name: project?.name || null,
        hrs_estimation_id: hrsEstimationId,
        order_details: orderDetails,
        staff_assignments: staffAssignments,
        quantities_imported_from_hrs: derivedQuantityKeys.size > 0,
        imported_hrs_snapshot_id: importedHrsSnapshotId,
        cart_items: cart, // Store full cart for rehydration
      };

      const result = await labFeesAPI.createOrder(orderData);
      alert(`Order saved successfully! Order ID: ${result.id}\nTotal Cost: $${result.total_cost?.toFixed(2) || totalCost.toFixed(2)}`);
    } catch (error) {
      alert('Error saving order: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Create New Lab Handler (supports duplicating from existing lab)
  const handleCreateLab = async () => {
    if (!newLab.name.trim()) {
      alert('Please enter a lab name');
      return;
    }
    try {
      const labData = {
        name: newLab.name.trim(),
        address: newLab.address.trim() || null,
        contact_info: newLab.contact_info.trim() || null,
      };

      let created;
      if (newLab.duplicateFromId) {
        // Duplicate: copies all categories, tests, and rates from source lab
        created = await labFeesAPI.duplicateLab(newLab.duplicateFromId, labData);
      } else {
        // Create empty lab
        created = await labFeesAPI.createLab(labData);
      }

      // Refresh labs list and select the new lab
      const updatedLabs = await labFeesAPI.getLabs();
      setLabs(updatedLabs);
      const createdLab = updatedLabs.find(l => l.id === created.id);
      if (createdLab) handleLabChange(createdLab);
      setNewLab({ name: '', address: '', contact_info: '', duplicateFromId: '' });
      setShowAddLabModal(false);
      alert(newLab.duplicateFromId
        ? `Lab "${labData.name}" created with all categories, tests, and pricing copied! You can now delete tests that don't apply.`
        : `Lab "${labData.name}" created! Add categories and tests to get started.`
      );
    } catch (error) {
      alert('Error creating lab: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will permanently delete all tests and rates within it.')) {
      try {
        await labFeesAPI.deleteCategory(categoryId);
        // If the deleted category was selected, clear selection
        if (selectedCategory?.id === categoryId) {
          setSelectedCategory(null);
          setSelectedTest(null);
        }
        await fetchCategoriesForLab(selectedLab.id);
      } catch (error) {
        alert('Error deleting category: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  // Delete Test Handler
  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test? This will permanently delete all associated rates.')) {
      try {
        await labFeesAPI.deleteTest(testId);
        // If the deleted test was selected, clear selection
        if (selectedTest?.id === testId) {
          setSelectedTest(null);
        }
        await fetchCategoriesForLab(selectedLab.id);
      } catch (error) {
        alert('Error deleting test: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading lab test data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchLabs} className="retry-btn">
            Retry
          </button>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  if (!labs || labs.length === 0) {
    return (
      <div className="no-data-container">
        <div className="no-data-message">
          <h2>No Laboratories Available</h2>
          <p>No laboratories found. Click below to seed sample data.</p>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  if (!labs || labs.length === 0) {
    return (
      <div className="no-data-container">
        <div className="no-data-message">
          <h2>No Laboratories Available</h2>
          <p>No laboratories found. Click below to seed sample data.</p>
          <button onClick={handleSeedData} className="seed-btn">
            Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-tests-container">
      <nav className="app-top-nav">
        <button onClick={() => navigate('/')} className="nav-action-btn">
          Home
        </button>
        <div className="nav-title">
          <h1>Lab Fee Calculator</h1>
        </div>
        <button
          className="nav-action-btn"
          onClick={() => setShowAddCategoryModal(true)}
        >
          Add New Category
        </button>
      </nav>

      {/* <header className="lab-tests-header">
        <p>Calculate costs for laboratory testing services</p>
      </header> */}

      {/* Project Header with Navigation */}
      <ProjectHeader projectName={project?.name} moduleName="lab" />

      {/* HRS Data Changed Warning Banner */}
      {hrsDataChanged && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px',
          padding: '0 20px'
        }}>
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '15px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#856404', display: 'block', marginBottom: '4px' }}>
                ⚠️ HRS data has changed
              </strong>
              <p style={{ color: '#856404', margin: 0, fontSize: '0.9rem' }}>
                HRS sample data has been updated. Re-import to update Lab Fees quantities.
              </p>
            </div>
            <button
              onClick={handleImportHrsData}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginLeft: '20px',
                whiteSpace: 'nowrap'
              }}
            >
              Re-import HRS Sample Data
            </button>
          </div>
        </div>
      )}

      {/* HRS Data Available Banner */}
      {hrsDataAvailable && !hrsDataChanged && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px',
          padding: '0 20px'
        }}>
          <div style={{
            background: '#d1ecf1',
            border: '2px solid #17a2b8',
            borderRadius: '8px',
            padding: '15px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#0c5460', display: 'block', marginBottom: '4px' }}>
                ℹ️ HRS sample data available
              </strong>
              <p style={{ color: '#0c5460', margin: 0, fontSize: '0.9rem' }}>
                Import sample quantities from HRS Sample Estimator to populate Lab Fees tests.
              </p>
            </div>
            <button
              onClick={handleImportHrsData}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginLeft: '20px',
                whiteSpace: 'nowrap'
              }}
            >
              Import HRS Sample Data
            </button>
          </div>
        </div>
      )}


      <div className="lab-tests-content">
        {/* Laboratory Selector and Categories Sidebar */}
        <div className="categories-sidebar">
          <div className="lab-selector-section">
            <h3>🔬 Laboratory</h3>
            <div className="lab-selector-cards">
              {labs.map(lab => {
                const labCartCount = cart.filter(item => item.labId === lab.id).length;
                return (
                  <button
                    key={lab.id}
                    className={`lab-selector-card ${selectedLab?.id === lab.id ? 'active' : ''}`}
                    onClick={() => handleLabChange(lab)}
                  >
                    <span className="lab-card-name">{lab.name}</span>
                    {labCartCount > 0 && (
                      <span className="lab-cart-badge">{labCartCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {cart.length > 0 && (
              <div className="cart-summary-mini">
                🛒 {cart.length} test{cart.length !== 1 ? 's' : ''} in estimate
              </div>
            )}
            <button
              className="add-lab-btn"
              onClick={() => setShowAddLabModal(true)}
            >
              ➕ Add New Lab
            </button>
          </div>

          <h3>Service Categories</h3>
          <div className="categories-list">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="category-name">{category.name}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e74c3c',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: '0 5px'
                    }}
                    title="Delete Category"
                  >
                    🗑️
                  </button>
                </div>
                <div className="category-description">{category.description}</div>
                <div className="test-count">
                  {category.tests ? category.tests.length : 0} tests
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {selectedCategory && (
            <>
              <div className="category-header">
                <div className="category-title">
                  <h2>{selectedCategory.name}</h2>
                  <p>{selectedCategory.description}</p>
                </div>
                <button
                  className="add-test-btn"
                  onClick={() => {
                    setNewTest({ ...newTest, category: selectedCategory.name });
                    setShowAddTestModal(true);
                  }}
                >
                  ➕ Add New Test
                </button>
              </div>

              {/* Tests Grid */}
              <div className="tests-grid">
                {selectedCategory.tests && selectedCategory.tests.length > 0 ? (
                  selectedCategory.tests.map((test) => (
                    <div
                      key={test.id}
                      className={`test-card ${selectedTest?.id === test.id ? 'selected' : ''
                        }`}
                      onClick={() => setSelectedTest(test)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4>{test.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTest(test.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '0 5px'
                          }}
                          title="Delete Test"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="test-rates-preview">
                        {test.rates && test.rates.length > 0 && (
                          <>
                            <div className="min-price">
                              From {formatPrice(Math.min(...test.rates.map(r => r.price)))}
                            </div>
                            <div className="turn-times-count">
                              {test.rates.length} turnaround options
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-tests">
                    <p>No tests available for this category.</p>
                  </div>
                )}
              </div>

              {/* Detailed Pricing */}
              {selectedTest && (
                <div className="pricing-details">
                  <h3>📊 Pricing Details: {selectedTest.name}</h3>

                  <div className="pricing-table">
                    <div className="pricing-header">
                      <div>Quantity</div>
                      <div>Turnaround Time</div>
                      <div>Price</div>
                      <div>Total</div>
                      <div>Action</div>
                    </div>
                    {selectedTest.rates
                      .sort((a, b) => a.hours - b.hours)
                      .map((rate) => {
                        // Ensure turn_time is a string
                        const turnTimeStr = typeof rate.turn_time === 'string' ? rate.turn_time : rate.turn_time?.label || 'unknown';
                        const quantity = getQuantityForTurnaround(selectedTest.name, turnTimeStr);
                        const isSelected = selectedTurnTime === turnTimeStr;
                        const totalCost = quantity > 0 ? rate.price * quantity : 0;

                        // ROW-LEVEL LOCKING: Check if THIS specific row is derived from HRS
                        // Only derived rows are read-only - manual rows remain fully editable
                        const quantityKey = `${selectedTest.name}-${turnTimeStr}`;
                        const isDerivedRow = derivedQuantityKeys.has(quantityKey);

                        return (
                          <div
                            key={`${rate.id}-${turnTimeStr}-${rate.hours}`}
                            className={`pricing-row ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="quantity-controls">
                              {/* ROW-LEVEL LOCKING: Only derived rows are read-only */}
                              {/* Manual rows remain fully editable even after HRS import */}
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={quantity === 0 ? '' : quantity}
                                readOnly={isDerivedRow}
                                disabled={isDerivedRow}
                                className="quantity-input"
                                onChange={(e) => {
                                  if (!isDerivedRow) {
                                    const val = e.target.value;
                                    // Allow empty string (clearing input)
                                    if (val === '') {
                                      handleQuantityChange(selectedTest.name, turnTimeStr, 0);
                                    }
                                    // Validate strictly whole numbers
                                    else if (/^\d+$/.test(val)) {
                                      handleQuantityChange(selectedTest.name, turnTimeStr, parseInt(val, 10));
                                    }
                                    // Ignore invalid characters (non-digits)

                                    // Remove from derived set if needed
                                    if (derivedQuantityKeys.has(quantityKey)) {
                                      setDerivedQuantityKeys(prev => {
                                        const next = new Set(prev);
                                        next.delete(quantityKey);
                                        return next;
                                      });
                                    }
                                  }
                                }}
                                style={{
                                  backgroundColor: isDerivedRow ? '#f5f5f5' : 'white',
                                  cursor: isDerivedRow ? 'not-allowed' : 'text',
                                  opacity: isDerivedRow ? 0.7 : 1,
                                  border: isDerivedRow ? '2px solid #e0e0e0' : '2px solid #ccc'
                                }}
                                title={isDerivedRow
                                  ? "This quantity is derived from HRS Sample Estimator outputs and cannot be manually edited"
                                  : "Enter quantity for this test"
                                }
                                placeholder="0"
                              />
                              {quantity > 0 && isDerivedRow && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  color: '#27ae60',
                                  fontStyle: 'italic',
                                  marginLeft: '8px',
                                  fontWeight: 600
                                }}>
                                  (from HRS)
                                </span>
                              )}
                            </div>
                            <div
                              className="turn-time"
                              onClick={() => setSelectedTurnTime(turnTimeStr)}
                            >
                              <span
                                className="turn-time-indicator"
                                style={{ backgroundColor: getTurnTimeColor(rate.hours) }}
                              ></span>
                              <span className="turn-time-label">{turnTimeStr}</span>
                              {rate.sample_count && rate.sample_count > 0 && (
                                <span className="rate-sample-count">
                                  • Samples: {rate.sample_count.toLocaleString('en-US')}
                                </span>
                              )}
                            </div>
                            <div className="price-container">
                              <div className="price">{formatPrice(rate.price)}</div>
                              {rate.sample_count && rate.sample_count > 0 ? (
                                <div className="rate-total-cost">
                                  ${(rate.sample_count * rate.price).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                              ) : (
                                <div className="rate-total-cost">$0.00</div>
                              )}
                            </div>
                            <div className="total-cost">
                              {quantity > 0 ? formatPrice(totalCost) : '-'}
                            </div>
                            <div className="add-to-cart-cell">
                              <button
                                type="button"
                                className="add-to-cart-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(selectedTest, rate, selectedCategory);
                                }}
                                title="Add to Estimate"
                              >
                                Add ➕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart-Based Order Summary */}
      {cart.length > 0 && (() => {
        const grouped = getCartGroupedByLab();
        const { totalSamples, totalCost } = getCartTotals();
        return (
          <div className="order-summary-container">
            <div className="order-summary-card">
              <h3>🛒 Estimate Summary</h3>
              <table className="estimate-table">
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Test</th>
                    <th>Turnaround</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([labName, items]) => {
                    const labTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                    return (
                      <React.Fragment key={labName}>
                        {items.map((item, idx) => (
                          <tr key={item.id} className="estimate-row">
                            {idx === 0 ? (
                              <td rowSpan={items.length} className="estimate-lab-cell">
                                <span className="estimate-lab-name">🔬 {labName}</span>
                              </td>
                            ) : null}
                            <td>
                              <div className="estimate-test-name">{item.testName}</div>
                              <div className="estimate-category">{item.categoryName}</div>
                            </td>
                            <td className="estimate-turnaround">{item.turnTime}</td>
                            <td className="estimate-qty-cell">
                              <div className="estimate-qty-controls">
                                <button className="quantity-btn" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>−</button>
                                <span className="estimate-qty-value">{item.quantity}</span>
                                <button className="quantity-btn" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                              </div>
                            </td>
                            <td className="estimate-price">{formatPrice(item.price)}</td>
                            <td className="estimate-total">{formatPrice(item.quantity * item.price)}</td>
                            <td>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="estimate-remove-btn"
                                title="Remove from estimate"
                              >✕</button>
                            </td>
                          </tr>
                        ))}
                        <tr className="estimate-subtotal-row">
                          <td colSpan="5" style={{ textAlign: 'right', fontWeight: '700' }}>Lab Subtotal:</td>
                          <td className="estimate-total" style={{ fontWeight: '700' }}>{formatPrice(labTotal)}</td>
                          <td></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="estimate-grand-total-row">
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: '800' }}>Grand Total</td>
                    <td style={{ fontWeight: '700', textAlign: 'center' }}>{totalSamples}</td>
                    <td></td>
                    <td className="estimate-grand-total">{formatPrice(totalCost)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* HRS-derived notice */}
      {derivedQuantityKeys.size > 0 && Object.keys(quantities).length > 0 && (
        <div style={{
          maxWidth: '1200px',
          margin: '5px auto 20px',
          padding: '12px 20px',
          background: '#e8f5e9',
          border: '2px solid #27ae60',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, color: '#2c3e50', fontWeight: 600 }}>
            ℹ️ Lab Fees quantities are derived from HRS Sample Estimator outputs.
            Quantities match HRS totals exactly and cannot be manually edited.
          </p>
        </div>
      )}

      {/* Field Collection Staff Section */}
      {(() => {
        const { totalSamples } = calculateOrderSummary();
        return (showStaffSection || staffRows.some(row => row.role) || totalSamples > 0 || cart.length > 0);
      })() && (
          <div style={{ maxWidth: '1200px', margin: '10px auto 30px', padding: '0 20px' }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#2c3e50', margin: 0 }}>Field Collection Staff</h3>
                <button
                  onClick={() => setShowStaffSection(!showStaffSection)}
                  style={{
                    padding: '8px 16px',
                    background: showStaffSection ? '#e74c3c' : '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  {showStaffSection ? '▼ Hide' : '▶ Show'} Staff Section
                </button>
              </div>

              {showStaffSection && (
                <div>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                    Add staff who will collect the samples. Enter their role, how many people, and how many hours each person will work.
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '15px', marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#2c3e50' }}>
                      <div>Role</div>
                      <div>Count</div>
                      <div>Hours per Person</div>
                      <div>Hourly Rate</div>
                      <div></div>
                    </div>

                    {staffRows.map((row, index) => {
                      const rate = getRoleRate(row.role);
                      const totalHours = row.count * row.hours_per_person;
                      const totalCost = rate ? totalHours * rate : 0;

                      return (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '15px', padding: '15px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', marginBottom: '10px', alignItems: 'center' }}>
                          <select
                            value={row.role}
                            onChange={(e) => handleStaffRoleChange(index, e.target.value)}
                            style={{
                              padding: '10px',
                              border: '2px solid #e0e0e0',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                          >
                            <option value="">-- Select Role --</option>
                            {laborRates.map((rateEntry) => (
                              <option key={rateEntry.labor_role} value={rateEntry.labor_role}>
                                {rateEntry.labor_role} (${rateEntry.hourly_rate.toFixed(2)}/hr)
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.count}
                            onChange={(e) => handleStaffCountChange(index, e.target.value)}
                            style={{
                              padding: '10px',
                              border: '2px solid #e0e0e0',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                            placeholder="1"
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={row.hours_per_person}
                            onChange={(e) => handleStaffHoursChange(index, e.target.value)}
                            style={{
                              padding: '10px',
                              border: '2px solid #e0e0e0',
                              borderRadius: '6px',
                              fontSize: '0.95rem'
                            }}
                            placeholder="0"
                          />

                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            {rate ? `$${rate.toFixed(2)}/hr` : 'N/A'}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (row.role) {
                                // Clear the selection (delete function)
                                const newRows = [...staffRows];
                                newRows[index] = { role: '', count: 1, hours_per_person: 0 };
                                setStaffRows(newRows);
                              } else {
                                // Remove the row if no role selected
                                handleRemoveStaffRow(index);
                              }
                            }}
                            className={row.role ? 'delete-staff-btn' : ''}
                            style={!row.role ? {
                              padding: '8px 12px',
                              background: staffRows.length === 1 ? '#ccc' : '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: staffRows.length > 1 ? 'pointer' : 'not-allowed',
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            } : {}}
                            disabled={!row.role && staffRows.length === 1}
                            title={row.role ? 'Delete selected staff' : 'Remove row'}
                          >
                            {row.role ? (
                              <>
                                <span>🗑️</span>
                                <span>Delete</span>
                              </>
                            ) : (
                              '✕'
                            )}
                          </button>

                          {row.role && row.count > 0 && row.hours_per_person > 0 && rate && (
                            <div style={{ gridColumn: '1 / -1', padding: '10px', background: '#e8f5e9', borderRadius: '6px', marginTop: '10px', fontSize: '0.9rem', color: '#2e7d32' }}>
                              <strong>Total for {row.role}:</strong> {row.count} person{row.count !== 1 ? 's' : ''} × {row.hours_per_person} hours = {totalHours.toFixed(2)} hours × ${rate.toFixed(2)}/hr = <strong>${totalCost.toFixed(2)}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddStaffRow}
                      style={{
                        padding: '12px 20px',
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        marginTop: '10px'
                      }}
                    >
                      Add Another Staff Member
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Order Summary - Based on sample_count */}
      {(() => {
        const { totalSamples, totalCost, breakdown } = calculateOrderSummary();
        const { totalCost: staffCost, breakdown: staffBreakdown } = calculateStaffCosts();
        const { totalSamples: cartSamples, totalCost: cartCost } = getCartTotals();
        const combinedSamples = totalSamples + cartSamples;
        const combinedLabCost = totalCost + cartCost;
        const grandTotal = combinedLabCost + staffCost;

        if (combinedSamples > 0 || combinedLabCost > 0 || staffCost > 0) {
          return (
            <div className="order-summary-container">
              <div className="order-summary-card">
                <h3>Grand Total</h3>
                <div className="order-summary-details">
                  {/* Breakdown by test and turnaround time */}
                  {breakdown.length > 0 && (
                    <div className="order-summary-breakdown">
                      <h4 className="breakdown-title">Breakdown by Test:</h4>
                      {breakdown.map((item, index) => (
                        <div key={index} className="breakdown-item">
                          <div className="breakdown-test-info">
                            <span className="breakdown-test-name">{item.testName}</span>
                            <span className="breakdown-turn-time">({item.turnTime})</span>
                          </div>
                          <div className="breakdown-values">
                            <span className="breakdown-samples">
                              {item.sampleCount.toLocaleString('en-US')} samples
                            </span>
                            <span className="breakdown-cost">
                              ${item.cost.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Labor Costs */}
                  {staffCost > 0 && staffBreakdown.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
                      <h4 className="breakdown-title">Field Collection Labor Costs:</h4>
                      {staffBreakdown.map((item, index) => (
                        <div key={index} className="breakdown-item" style={{ marginBottom: '8px' }}>
                          <div>
                            <strong>{item.role}</strong> - {item.count} person{item.count !== 1 ? 's' : ''} × {item.hours_per_person} hours = {item.total_hours.toFixed(2)} hours
                          </div>
                          <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                            ${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                      <div className="breakdown-item highlight" style={{ marginTop: '10px' }}>
                        <span>Total Field Collection Labor Cost:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          ${staffCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="order-summary-totals">
                    <div className="order-summary-item">
                      <span className="order-summary-label">Total Samples:</span>
                      <span className="order-summary-value">
                        {combinedSamples.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="order-summary-item">
                      <span className="order-summary-label">Lab Fees Cost:</span>
                      <span className="order-summary-value">
                        ${combinedLabCost.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                    {staffCost > 0 && (
                      <div className="order-summary-item">
                        <span className="order-summary-label">Field Collection Labor Cost:</span>
                        <span className="order-summary-value">
                          ${staffCost.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    )}
                    <div className="order-summary-item highlight">
                      <span className="order-summary-label">Grand Total:</span>
                      <span className="order-summary-value order-summary-total">
                        ${grandTotal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Save Order Button */}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0', textAlign: 'center' }}>
                    <button
                      onClick={handleSaveOrder}
                      style={{
                        padding: '12px 30px',
                        background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                        marginRight: '10px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      💾 Save Order
                    </button>
                  </div>

                  {/* Add Labor Button REMOVED */}

                  {/* Calculation Breakdown Toggle */}
                  {(combinedSamples > 0 || combinedLabCost > 0 || staffCost > 0) && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0', textAlign: 'center' }}>
                      <button
                        className={`show-breakdown-btn ${showBreakdown ? 'active' : ''}`}
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        style={{
                          padding: '12px 24px',
                          background: showBreakdown ? '#27ae60' : '#95a5a6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {showBreakdown ? '▼ Hide Calculation Breakdown' : '▶ Show Calculation Breakdown'}
                      </button>
                    </div>
                  )}

                  {/* Detailed Calculation Breakdown */}
                  {showBreakdown && (() => {
                    const { totalSamples: breakdownSamples, totalCost: breakdownCost, breakdown: breakdownList } = calculateOrderSummary();
                    const { totalCost: breakdownStaffCost, breakdown: breakdownStaffList } = calculateStaffCosts();

                    // Build order_details format for breakdown component
                    const orderDetails = {};
                    breakdownList.forEach(item => {
                      // Find test ID and turn time ID from categories
                      for (const category of categories) {
                        if (category.tests) {
                          for (const test of category.tests) {
                            if (test.name === item.testName && test.rates) {
                              const testId = test.id;
                              if (!orderDetails[testId]) {
                                orderDetails[testId] = {};
                              }
                              for (const rate of test.rates) {
                                const rateTurnTime = typeof rate.turn_time === 'string'
                                  ? rate.turn_time
                                  : rate.turn_time?.label || '';
                                if (rateTurnTime === item.turnTime) {
                                  const turnTimeId = typeof rate.turn_time === 'object'
                                    ? rate.turn_time?.id
                                    : rate.turn_time_id;
                                  orderDetails[testId][turnTimeId] = item.sampleCount;
                                  break;
                                }
                              }
                              break;
                            }
                          }
                        }
                      }
                    });

                    return (
                      <LabFeesBreakdownDetails
                        details={{
                          total_samples: breakdownSamples,
                          total_lab_fees_cost: breakdownCost,
                          total_staff_labor_cost: breakdownStaffCost,
                          total_cost: breakdownCost + breakdownStaffCost,
                          staff_breakdown: breakdownStaffList.map(item => ({
                            role: item.role,
                            count: item.count,
                            total_hours: item.total_hours
                          })),
                          staff_labor_costs: breakdownStaffList.reduce((acc, item) => {
                            acc[item.role] = item.cost;
                            return acc;
                          }, {})
                        }}
                        inputs={{
                          order_details: orderDetails
                        }}
                        categories={categories}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Add Lab Modal */}
      {showAddLabModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🔬 Add New Laboratory</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateLab();
            }}>
              <div className="form-group">
                <label htmlFor="lab-name">Lab Name: *</label>
                <input
                  id="lab-name"
                  type="text"
                  value={newLab.name}
                  onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                  placeholder="e.g. ATLAS, EMLab P&K"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lab-duplicate">Copy data from:</label>
                <select
                  id="lab-duplicate"
                  value={newLab.duplicateFromId || ''}
                  onChange={(e) => setNewLab({ ...newLab, duplicateFromId: e.target.value ? parseInt(e.target.value) : '' })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '0.95rem' }}
                >
                  <option value="">— Start empty (no data) —</option>
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name} (copy all categories, tests & pricing)</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.8rem', color: '#7f8c8d', margin: '6px 0 0' }}>
                  Select a lab to copy all its categories, tests, and pricing into the new lab. You can then delete what doesn't apply.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="lab-address">Address:</label>
                <input
                  id="lab-address"
                  type="text"
                  value={newLab.address}
                  onChange={(e) => setNewLab({ ...newLab, address: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lab-contact">Contact Info:</label>
                <input
                  id="lab-contact"
                  type="text"
                  value={newLab.contact_info}
                  onChange={(e) => setNewLab({ ...newLab, contact_info: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="modal-btn primary">
                  {newLab.duplicateFromId ? '📋 Duplicate & Create Lab' : 'Create Lab'}
                </button>
                <button type="button" className="modal-btn secondary" onClick={() => {
                  setShowAddLabModal(false);
                  setNewLab({ name: '', address: '', contact_info: '', duplicateFromId: '' });
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Add New Category</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await labFeesAPI.createCategory(newCategory, selectedLab.id);
                await fetchCategoriesForLab(selectedLab.id); // Refresh the categories
                setShowAddCategoryModal(false);
                setNewCategory({ name: '', description: '' });
                alert('Category created successfully!');
              } catch (error) {
                alert('Error creating category: ' + (error.response?.data?.detail || error.message));
              }
            }}>
              <div className="form-group">
                <label htmlFor="category-name">Category Name:</label>
                <input
                  id="category-name"
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  required
                  placeholder="Enter category name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="category-description">Description:</label>
                <textarea
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Enter category description"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {showAddTestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>➕ Add New Test</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // 1. Create the test first
                const testData = {
                  name: newTest.name,
                  description: newTest.description
                };
                const createdTest = await labFeesAPI.createTest(testData, selectedCategory.id);

                // 2. Create rates for each pricing entry
                if (currentTestPricing.length > 0) {
                  await Promise.all(currentTestPricing.map(pricing => {
                    // Turn time might be an object or ID depending on how it's handled
                    // But in this form we will ensure it is the ID from the select
                    if (!pricing.turn_time_id || !pricing.price) return Promise.resolve();

                    const rateData = {
                      test_id: createdTest.id,
                      turn_time_id: parseInt(pricing.turn_time_id),
                      lab_id: selectedLab.id,
                      price: parseFloat(pricing.price)
                    };
                    return labFeesAPI.createRate(rateData);
                  }));
                }

                await fetchCategoriesForLab(selectedLab.id); // Refresh the categories and tests
                setShowAddTestModal(false);
                setNewTest({ name: '', description: '', category: '', pricing: [] });
                setCurrentTestPricing([]);
                alert('Test and rates created successfully!');
              } catch (error) {
                alert('Error creating test: ' + (error.response?.data?.detail || error.message));
              }
            }}>
              <div className="form-group">
                <label htmlFor="test-name">Test Name:</label>
                <input
                  id="test-name"
                  type="text"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  required
                  placeholder="Enter test name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="test-description">Description:</label>
                <textarea
                  id="test-description"
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  placeholder="Enter test description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label htmlFor="test-category">Category:</label>
                <input
                  id="test-category"
                  type="text"
                  value={selectedCategory ? selectedCategory.name : ''}
                  readOnly
                  className="readonly-input"
                />
              </div>

              {/* Pricing Section */}
              <div className="form-group">
                <label>Pricing (Turnaround Times & Prices):</label>
                <div className="pricing-inputs">
                  {currentTestPricing.map((pricing, index) => (
                    <div key={index} className="pricing-row-input">
                      <select
                        value={pricing.turn_time_id}
                        onChange={(e) => {
                          const newPricing = [...currentTestPricing];
                          newPricing[index].turn_time_id = e.target.value;
                          setCurrentTestPricing(newPricing);
                        }}
                        className="turn-time-input"
                        required
                      >
                        <option value="">Select Turnaround Time</option>
                        {turnTimes.map(tt => (
                          <option key={tt.id} value={tt.id}>{tt.label} ({tt.hours} hr)</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={pricing.price}
                        onChange={(e) => {
                          const newPricing = [...currentTestPricing];
                          // Allow empty string for better UX, convert to float only if valid number
                          const val = e.target.value;
                          newPricing[index].price = val === '' ? '' : parseFloat(val);
                          setCurrentTestPricing(newPricing);
                        }}
                        className="price-input"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newPricing = currentTestPricing.filter((_, i) => i !== index);
                          setCurrentTestPricing(newPricing);
                        }}
                        className="remove-pricing-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentTestPricing([...currentTestPricing, { turn_time_id: '', price: '' }])}
                    className="add-pricing-btn"
                  >
                    ➕ Add Pricing
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddTestModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="lab-tests-footer">
        <p>💡 Need help choosing the right test? Contact our lab team for assistance.</p>
      </footer>
    </div>
  );
};

export default LabTests;
