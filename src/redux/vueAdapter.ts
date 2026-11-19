import { ref, readonly, watch, onUnmounted, type DeepReadonly, type Ref } from 'vue'
import { store, type RootState, type AppDispatch } from './store'

/**
 * Reactive selector hook for Vue 3 components to subscribe to Redux state.
 */
export function useAppSelector<T>(selector: (state: RootState) => T): DeepReadonly<Ref<T>> {
  const stateRef = ref<T>(selector(store.getState())) as Ref<T>

  const unsubscribe = store.subscribe(() => {
    const nextValue = selector(store.getState())
    if (stateRef.value !== nextValue) {
      stateRef.value = nextValue
    }
  })

  onUnmounted(() => {
    unsubscribe()
  })

  return readonly(stateRef) as DeepReadonly<Ref<T>>
}

/**
 * Redux dispatch helper for Vue 3 components.
 */
export function useAppDispatch(): AppDispatch {
  return store.dispatch
}

/**
 * Vue 3 reactive wrapper around an RTK Query endpoint query.
 */
export function useApiQuery<TData = any, TArgs = any>(
  endpoint: any,
  args?: Ref<TArgs> | (() => TArgs) | TArgs,
) {
  const getArgsValue = (): TArgs => {
    if (typeof args === 'function') {
      return (args as () => TArgs)()
    }
    if (args && typeof args === 'object' && 'value' in args) {
      return (args as Ref<TArgs>).value
    }
    return args as TArgs
  }

  // Pre-populate immediately from Redux RTK Query cache if available
  const initialArgs = getArgsValue()
  const initialCache = endpoint.select(initialArgs)(store.getState())
  const hasCachedData = initialCache && initialCache.data !== undefined

  const data = ref<TData | undefined>(hasCachedData ? initialCache.data : undefined) as Ref<TData | undefined>
  const isLoading = ref<boolean>(!hasCachedData)
  const isFetching = ref<boolean>(false)
  const error = ref<any>(null)

  let currentSubscription: any = null

  const runQuery = () => {
    isFetching.value = true
    const queryArgs = getArgsValue()

    // Immediately check if cache already has data for this query
    const existing = endpoint.select(queryArgs)(store.getState())
    if (existing && existing.data !== undefined) {
      data.value = existing.data
      isLoading.value = false
    } else if (data.value === undefined) {
      isLoading.value = true
    }

    if (currentSubscription) {
      currentSubscription.unsubscribe()
    }

    const result = store.dispatch(endpoint.initiate(queryArgs, { subscribe: true }))
    currentSubscription = result

    result
      .then((res: any) => {
        if (res.isError) {
          error.value = res.error
        } else if (res.data !== undefined) {
          data.value = res.data
          error.value = null
        }
      })
      .catch((err: any) => {
        error.value = err
      })
      .finally(() => {
        isLoading.value = false
        isFetching.value = false
      })
  }

  runQuery()

  // Subscribe to changes in the RTK query cache
  const unsubscribeStore = store.subscribe(() => {
    const queryArgs = getArgsValue()
    const state = endpoint.select(queryArgs)(store.getState())
    if (state) {
      // NEVER overwrite existing valid data with undefined while a query is in-flight
      if (state.data !== undefined) {
        data.value = state.data
      }
      if (state.status === 'fulfilled') {
        isLoading.value = false
      }
      isFetching.value = state.isFetching
      if (state.error) {
        error.value = state.error
      }
    }
  })

  // Reactively trigger runQuery when reactive args change
  if (typeof args === 'function' || (args && typeof args === 'object' && 'value' in args)) {
    watch(
      () => getArgsValue(),
      () => {
        runQuery()
      },
      { deep: true }
    )
  }

  onUnmounted(() => {
    if (currentSubscription) {
      currentSubscription.unsubscribe()
    }
    unsubscribeStore()
  })

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: runQuery,
  }
}

/**
 * Vue 3 reactive wrapper around an RTK Query mutation.
 */
export function useApiMutation<TData = any, TArgs = any>(endpoint: any) {
  const isLoading = ref(false)
  const error = ref<any>(null)
  const data = ref<TData | undefined>(undefined)

  const mutate = async (args: TArgs): Promise<{ data?: TData; error?: any }> => {
    isLoading.value = true
    error.value = null
    try {
      const result: any = await store.dispatch(endpoint.initiate(args)).unwrap()
      data.value = result
      return { data: result }
    } catch (err: any) {
      error.value = err
      return { error: err }
    } finally {
      isLoading.value = false
    }
  }

  return [mutate, { isLoading, error, data }] as const
}
