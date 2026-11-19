import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import EmployeesView from '../views/EmployeesView.vue'
import { store } from '../redux/store'
import { loginSuccess, switchRole } from '../redux/slices/authSlice'
import { demoUsers } from '../services/authProfiles'
import router from '../router'

describe('EmployeesView Component & Route Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    store.dispatch(
      loginSuccess({
        user: demoUsers.admin,
        token: 'test-token',
      })
    )
  })

  it('mounts properly for Super Admin without render errors', async () => {
    const wrapper = mount(EmployeesView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Employee Directory')
    expect(wrapper.text()).toContain('All Company Data')
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('mounts properly for General Employee with scoped view', async () => {
    store.dispatch(switchRole('General Employee'))

    const wrapper = mount(EmployeesView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Employee Directory')
  })
})
