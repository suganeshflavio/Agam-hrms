import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'
import { store } from '../redux/store'
import { loginSuccess } from '../redux/slices/authSlice'
import { demoUsers } from '../services/authProfiles'

describe('Route Navigation to /employees', () => {
  it('renders employees page after navigation', async () => {
    localStorage.clear()
    store.dispatch(
      loginSuccess({
        user: demoUsers.admin,
        token: 'test-token',
      })
    )

    router.push('/employees')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Employee Directory')
  })

  it('navigates from dashboard to /employees cleanly without blank screen', async () => {
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Dashboard')

    // Navigate to employees
    await router.push('/employees')
    await new Promise((resolve) => setTimeout(resolve, 50))

    console.log('After nav text includes Employee Directory:', wrapper.text().includes('Employee Directory'))
    expect(wrapper.text()).toContain('Employee Directory')
  })
})
