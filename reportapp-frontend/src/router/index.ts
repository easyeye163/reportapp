import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/FrameManagement.vue')
    },
    {
      path: '/progress',
      name: 'progress',
      component: () => import('../views/ReportProgress.vue')
    },
    {
      path: '/guide',
      name: 'guide',
      component: () => import('../views/OperationGuide.vue')
    },
    {
      path: '/cases',
      name: 'cases',
      component: () => import('../views/ReportCases.vue')
    },
    {
      path: '/report-edit',
      name: 'report-edit',
      component: () => import('../views/ReportEdit.vue')
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('../views/ReviewManagement.vue')
    },
    {
      path: '/export',
      name: 'export',
      component: () => import('../views/ReportExport.vue')
    },
    {
      path: '/archive',
      name: 'archive',
      component: () => import('../views/ReportArchive.vue')
    },
    {
      path: '/user',
      name: 'user',
      component: () => import('../views/UserManagement.vue')
    },
    {
      path: '/backup',
      name: 'backup',
      component: () => import('../views/DataBackup.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/NotificationCenter.vue')
    },
    {
      path: '/user-center',
      name: 'user-center',
      component: () => import('../views/UserCenter.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue')
    },
    {
      path: '/frame-edit',
      name: 'frame-edit',
      component: () => import('../views/FrameEdit.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.public) {
    if (token && to.name === 'login') {
      next({ name: 'home' })
    } else {
      next()
    }
  } else {
    if (!token) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  }
})

export default router
