import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import Home from '@/views/Home.vue';
import Dashboard from '@/views/Dashboard.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: Home,
            meta: { requiresAuth: false },
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: Dashboard,
            meta: { requiresAuth: true },
        },
    ],
});

// Navigation guard pour protéger les routes
router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore();

    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
        // Redirect to home if not authenticated
        next({ name: 'home' });
    } else if (to.name === 'home' && userStore.isAuthenticated) {
        // Redirect to dashboard if already authenticated
        next({ name: 'dashboard' });
    } else {
        next();
    }
});

export default router;
