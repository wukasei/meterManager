// Breakpoints
export const BREAKPOINTS = {
  mobile: '(max-width:600px)',
  mobileWide: '(max-width:800px)',
  tablet: '(max-width:960px)',
  md: 'md',
  sm: 'sm',
};

// Table column widths
export const TABLE_COLUMNS = {
  meters: {
    serialNumber: '20%',
    location: '25%',
    resourceType: '20%',
    status: '20%',
    actions: '15%',
  },
  acts: {
    minWidthTablet: 1200,
    minWidthDesktop: 1500,
  },
};

// Meter reading categories
export const METER_CATEGORIES = {
  CA: 'CA',
  CP: 'CP',
  GR: 'GR',
};

// Category labels (short)
export const CATEGORY_LABELS_SHORT = {
  CA: 'СА',
  CP: 'СР',
  GR: 'ГР',
};

// Calculation methods
export const CALCULATION_METHODS = {
  direct: 'direct',
  areaBased: 'area_based',
  mixed: 'mixed',
};

// Resource types (for filtering)
export const RESOURCE_TYPES = {
  electricity: 'Електроенергія',
  waterAll: 'Вода (всі)',
  waterCold: 'Холодна вода',
  waterHot: 'Гаряча вода',
  gas: 'Газ',
};

// Months
export const MONTHS = [
  { value: '01', label: 'Січень' },
  { value: '02', label: 'Лютий' },
  { value: '03', label: 'Березень' },
  { value: '04', label: 'Квітень' },
  { value: '05', label: 'Травень' },
  { value: '06', label: 'Червень' },
  { value: '07', label: 'Липень' },
  { value: '08', label: 'Серпень' },
  { value: '09', label: 'Вересень' },
  { value: '10', label: 'Жовтень' },
  { value: '11', label: 'Листопад' },
  { value: '12', label: 'Грудень' },
];

// Default values
export const DEFAULTS = {
  calculationCoefficient: 1,
  areaPercentage: 100,
  occupiedArea: {
    min: 0,
    max: 100,
  },
  snackbarDuration: 6000,
  dialogMaxWidth: {
    sm: 'sm',
    md: 'md',
  },
  formMaxWidth: 500,
  formMaxWidthTablet: '90%',
  paperElevation: 1,
  borderRadius: 2,
};

// Status values
export const STATUS = {
  active: true,
  inactive: false,
};

// Dialog actions
export const DIALOG_ACTIONS = {
  delete: 'delete',
  deactivate: 'deactivate',
};

// Entity types
export const ENTITY_TYPES = {
  location: 'location',
  meter: 'meter',
  tenant: 'tenant',
  tariff: 'tariff',
  resourceType: 'resourceType',
  delivery: 'delivery',
};

// Default act options
export const DEFAULT_ACT_OPTIONS = {
  organization: 'ТОВ «Про Тек Вікна Україна»',
  executorName: 'Бенько І. Г.',
  executorTitle: 'інж.-енергетик',
  tenantCompany: 'ТОВ «ГалФрост»',
  tenantRepresentative: 'Ситнік І.Ю.',
  address: 'Львівська обл., с. Зимна Вода, вул. Яворівська, 30',
};

// Consumption labels by resource type
export const CONSUMPTION_LABELS = {
  electricity: 'Спожита електроенергія (кВт·год)',
  water: 'Спожита вода, куб. м.',
  gas: 'Спожита теплова енергія, Гкал',
};

// Water resource types (for filtering)
export const WATER_RESOURCES = ['вода (всі)', 'холодна вода', 'гаряча вода'];

// Spacing values
export const SPACING = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
};

// Component sizes
export const SIZES = {
  button: {
    minWidth: 160,
    height: 40,
    mobileHeight: 44,
    desktopHeight: 36,
  },
  iconButton: {
    small: 20,
    medium: 24,
  },
  circularProgress: {
    small: 20,
    medium: 24,
  },
  searchField: {
    desktop: 300,
  },
};

// Form field configurations
export const FORM_FIELDS = {
  textField: {
    size: 'medium',
    variant: 'outlined',
  },
  select: {
    size: 'small',
    minWidth: 150,
  },
};

// Dialog configurations
export const DIALOG_CONFIG = {
  fullWidth: true,
  maxWidth: {
    sm: 'sm',
    md: 'md',
  },
  paperMaxWidth: 500,
  paperMaxWidthTablet: '90%',
};

// Table configurations
export const TABLE_CONFIG = {
  size: 'small',
  stickyHeader: true,
};

// Color values (if not in theme)
export const COLORS = {
  error: {
    bg: '#ffebee',
  },
  info: {
    bg: '#f0f7ff',
    border: '#2196f3',
  },
  divider: '#e0e0e0',
  background: {
    light: '#fafafa',
    lighter: '#f5f5f5',
  },
};

// Local storage keys
export const STORAGE_KEYS = {
  sidebarCollapsed: 'sidebarCollapsed',
  expandedMenus: 'expandedMenus',
};

// Date formats
export const DATE_FORMATS = {
  iso: 'YYYY-MM-DD',
  display: 'DD.MM.YYYY',
};
