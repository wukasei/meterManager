import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Button,
  SwipeableDrawer,
  Collapse,
  Tooltip,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  Dashboard,
  Settings,
  Description,
  ChevronLeft,
  ChevronRight,
  ExitToApp,
  Menu,
  Assignment,
  AccountCircle,
  ExpandLess,
  ExpandMore,
  LocationOn,
  Category,
  People,
  LocalShipping,
  AttachMoney,
  Speed,
  Link,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { NavLink } from 'react-router-dom';
import { Scrollbar } from 'react-scrollbars-custom';
import { useAuthContext } from '../contexts/AuthContext';
import useMediaQuery from '../hooks/useMediaQuery';
import { UA } from '../utils/uaDictionary';
import { BREAKPOINTS, STORAGE_KEYS } from '../constants';

const Sidebar = () => {
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(BREAKPOINTS.tablet);

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
      return saved === 'true';
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const [expandedMenus, setExpandedMenus] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.expandedMenus);
      try {
        return saved ? JSON.parse(saved) : {};
      } catch (error) {
        console.warn('Failed to parse expandedMenus from localStorage:', error);
        return {};
      }
    }
    return {};
  });

  const { isAuthenticated, user, loginWithRedirect, handleLogout, isAdmin } = useAuthContext();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed.toString());
    }
  }, [collapsed]);

  useEffect(() => {
    if (!isMobileOrTablet && mobileOpen) {
      setMobileOpen(false);
    }
  }, [isMobileOrTablet, mobileOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.expandedMenus, JSON.stringify(expandedMenus));
      } catch (error) {
        console.warn('Failed to save expandedMenus to localStorage:', error);
      }
    }
  }, [expandedMenus]);

  const toggleMenu = useCallback((key) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleMobileDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleMobileDrawerOpen = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const menuItems = [
    { key: '1', label: UA.sidebar_submit_readings, icon: <Assignment />, path: '/' },
    ...(isAdmin
      ? [
          {
            key: '2',
            label: UA.sidebar_dashboard,
            icon: <Dashboard />,
            path: '/dashboard',
            hasSubmenu: true,
            submenu: [
              { key: '2-1', label: UA.sidebar_locations, path: '/dashboard/locations', icon: <LocationOn /> },
              { key: '2-2', label: UA.sidebar_resource_types, path: '/dashboard/resource-types', icon: <Category /> },
              { key: '2-3', label: UA.sidebar_tenants, path: '/dashboard/tenants', icon: <People /> },
              {
                key: '2-4',
                label: UA.sidebar_deliveries,
                path: '/dashboard/resource-delivery',
                icon: <LocalShipping />,
              },
              { key: '2-5', label: UA.sidebar_tariffs, path: '/dashboard/tariffs', icon: <AttachMoney /> },
              { key: '2-6', label: UA.sidebar_meters, path: '/dashboard/meters', icon: <Speed /> },
              { key: '2-7', label: UA.sidebar_meter_tenants, path: '/dashboard/meter-tenants', icon: <Link /> },
              { key: '2-8', label: UA.sidebar_users, path: '/dashboard/users', icon: <AccountCircle /> },
            ],
          },
        ]
      : []),
    { key: '3', label: UA.sidebar_reports, icon: <Description />, path: '/acts' },
  ];

  const MenuItem = ({ item, isCollapsed, expandedMenus, toggleMenu }) => {
    const hasSubmenu = item.hasSubmenu && item.submenu;
    const isExpanded = expandedMenus[item.key];

    if (hasSubmenu) {
      return (
        <>
          <Tooltip title={isCollapsed ? item.label : ''} placement="right" disableHoverListener={!isCollapsed}>
            <ListItemButton
              onClick={() => toggleMenu(item.key)}
              sx={{
                minHeight: 48,
                justifyContent: isCollapsed ? 'center' : 'initial',
                px: 2.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 3, color: 'inherit' }}>{item.icon}</ListItemIcon>
              {!isCollapsed && (
                <>
                  <ListItemText primary={item.label} />
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </>
              )}
            </ListItemButton>
          </Tooltip>

          {/* Collapsed mode - show submenu items as separate buttons */}
          {isCollapsed && isExpanded && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
              {item.submenu.map((subItem) => (
                <Tooltip key={subItem.key} title={subItem.label} placement="right">
                  <ListItemButton
                    component={NavLink}
                    to={subItem.path}
                    onClick={isMobileOrTablet ? handleMobileDrawerClose : undefined}
                    sx={{
                      minHeight: 40,
                      justifyContent: 'center',
                      px: 1,
                      '&.active': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 1,
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                      {subItem.icon && React.cloneElement(subItem.icon, { fontSize: 'small' })}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              ))}
            </Box>
          )}

          {/* Expanded mode - show submenu as collapsible list */}
          <Collapse in={!isCollapsed && isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map((subItem) => (
                <Tooltip
                  key={subItem.key}
                  title={isCollapsed ? subItem.label : ''}
                  placement="right"
                  disableHoverListener={!isCollapsed}
                >
                  <ListItemButton
                    component={NavLink}
                    to={subItem.path}
                    onClick={isMobileOrTablet ? handleMobileDrawerClose : undefined}
                    sx={{
                      pl: 6,
                      minHeight: 40,
                      '&.active': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRight: '3px solid #fff',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, color: 'inherit' }}>
                      {subItem.icon && React.cloneElement(subItem.icon, { fontSize: '1rem' })}
                    </ListItemIcon>
                    <ListItemText
                      primary={subItem.label}
                      primaryTypographyProps={{ marginLeft: 1, fontSize: '0.9rem' }}
                    />
                  </ListItemButton>
                </Tooltip>
              ))}
            </List>
          </Collapse>
        </>
      );
    }

    return (
      <Tooltip title={isCollapsed ? item.label : ''} placement="right" disableHoverListener={!isCollapsed}>
        <ListItemButton
          component={NavLink}
          to={item.path}
          onClick={isMobileOrTablet ? handleMobileDrawerClose : undefined}
          sx={{
            minHeight: 48,
            justifyContent: isCollapsed ? 'center' : 'initial',
            px: 2.5,
            '&.active': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRight: isCollapsed ? 'none' : '3px solid #fff',
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 3, color: 'inherit' }}>{item.icon}</ListItemIcon>
          {!isCollapsed && <ListItemText primary={item.label} />}
        </ListItemButton>
      </Tooltip>
    );
  };

  const UserSection = ({ isCollapsed }) => (
    <Box sx={{ mt: 'auto', p: 1, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
      {!isCollapsed || isMobileOrTablet ? (
        <Box sx={{ px: 1 }}>
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ flexGrow: 1, fontSize: '0.875rem', fontWeight: 500 }}
                noWrap
                title={user?.full_name || user?.name || UA.sidebar_user}
              >
                {user?.full_name || user?.name || UA.sidebar_user}
              </Typography>
              <Tooltip title={UA.sidebar_logout}>
                <IconButton
                  onClick={handleLogout}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <ExitToApp />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Button
              variant="outlined"
              onClick={loginWithRedirect}
              fullWidth
              size="small"
              sx={{
                textTransform: 'none',
                color: 'inherit',
                borderColor: 'currentColor',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'currentColor',
                },
              }}
            >
              {UA.sidebar_login_register}
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title={isAuthenticated ? UA.sidebar_logout : UA.sidebar_login}>
            <IconButton
              onClick={isAuthenticated ? handleLogout : loginWithRedirect}
              sx={{
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {isAuthenticated ? <ExitToApp /> : <AccountCircle />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  const drawerWidth = collapsed ? theme.custom.collapsedDrawerWidth : theme.custom.drawerWidth;

  const DrawerContent = ({ isCollapsed }) => (
    <>
      <Scrollbar
        style={{ height: 'calc(100vh - 80px)' }}
        noScrollX
        trackYProps={{
          renderer: ({ elementRef, style, ...props }) => (
            <div
              {...props}
              ref={elementRef}
              style={{
                ...style,
                width: '6px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 3,
              }}
            />
          ),
        }}
        thumbYProps={{
          renderer: ({ elementRef, style, ...props }) => (
            <div
              {...props}
              ref={elementRef}
              style={{
                ...style,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 3,
              }}
            />
          ),
        }}
      >
        <List sx={{ flexGrow: 1, pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {menuItems.map((item) => (
            <MenuItem
              key={item.key}
              item={item}
              isCollapsed={isCollapsed}
              expandedMenus={expandedMenus}
              toggleMenu={toggleMenu}
            />
          ))}
        </List>
      </Scrollbar>

      <UserSection isCollapsed={isCollapsed} />

      {!isMobileOrTablet && (
        <Box sx={{ p: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
            <Tooltip title={collapsed ? UA.sidebar_expand : UA.sidebar_collapse}>
              <IconButton
                onClick={toggleCollapsed}
                sx={{
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </>
  );

  return (
    <>
      {isMobileOrTablet && (
        <IconButton
          onClick={handleMobileDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            color: '#ffffff',
            backgroundColor: theme.palette.primary.main,
            boxShadow: 2,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
              boxShadow: 4,
            },
          }}
        >
          <Menu />
        </IconButton>
      )}

      {isMobileOrTablet ? (
        <SwipeableDrawer
          anchor="left"
          open={mobileOpen}
          onClose={handleMobileDrawerClose}
          onOpen={handleMobileDrawerOpen}
          sx={{
            '& .MuiDrawer-paper': {
              width: theme.custom.drawerWidth,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            },
          }}
        >
          <DrawerContent isCollapsed={false} />
        </SwipeableDrawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              boxSizing: 'border-box',
            },
          }}
        >
          <DrawerContent isCollapsed={collapsed} />
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
