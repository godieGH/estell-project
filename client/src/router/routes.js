import { useUserStore } from 'stores/user'
import { api } from 'boot/axios'

const routes = [
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('pages/LoginPage.vue'),
        beforeEnter: async () => {
          const userStore = useUserStore()
          if (userStore.isLoggedIn) {
            await userStore.clearUser()
            return true
          }
        },
      },
      {
        path: 'register',
        component: () => import('pages/RegisterPage.vue'),
      },
      {
        path: 'forgot-password',
        component: () => import('pages/ForgotPasswordPage.vue'),
      },
      {
        path: 'reset/password/:token',
        name: 'reset-password',
        component: () => import('pages/ResetPasswordPage.vue'),
        beforeEnter: async (to, from, next) => {
          const { token } = to.params
          try {
            await api.get(`/users/reset/password/${token}`)
            //console.log(from, res)
            next()
          } catch (err) {
            //console.log(err.status)
            next(`/auth/password/reset/error/${err.status}`)
          }
        },
      },
      {
        path: 'password/reset/error/:status',
        name: 'ErrorPassword',
        component: () => import('pages/ErrorPasswordPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/AppPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('pages/ProfilePage.vue'),
      },
      {
        path: 'people',
        name: 'people',
        component: () => import('pages/PeoplePage.vue'),
      },
      {
        path: 'create',
        name: 'create',
        component: () => import('components/CreatePanel.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    redirect: () => ({ name: 'error-page', params: { status: '404' } }),
  },
  {
    name: 'error-page',
    path: '/error/:status',
    component: () => import('pages/ErrorHandlerPage.vue'),
    props: true,
  },
]

export default routes
