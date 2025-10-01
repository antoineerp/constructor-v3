<script>
  import SkeletonAppBar from '$lib/components/SkeletonAppBar.svelte';
  import SkeletonCard from '$lib/components/SkeletonCard.svelte';
  import SkeletonModalDemo from '$lib/components/SkeletonModalDemo.svelte';
  import { ProgressBar, ProgressRadial, TabGroup, Tab } from '@skeletonlabs/skeleton';
  
  let activeTab = 0;
</script>

<svelte:head>
  <title>Skeleton UI Demo - Constructor V3</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
  <!-- Header -->
  <SkeletonAppBar title="Skeleton UI Demo" subtitle="Beautiful components" />
  
  <!-- Hero Section -->
  <section class="container mx-auto px-4 py-12">
    <div class="text-center space-y-6 mb-12">
      <h1 class="h1 font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
        Skeleton UI Components
      </h1>
      <p class="text-xl text-surface-600 max-w-2xl mx-auto">
        Beautiful, accessible, and production-ready components built with Skeleton UI and Tailwind CSS
      </p>
      <div class="flex justify-center gap-4">
        <button class="btn variant-filled-primary btn-lg">
          <i class="fas fa-rocket mr-2"></i>Get Started
        </button>
        <button class="btn variant-ghost-surface btn-lg">
          <i class="fas fa-book mr-2"></i>Documentation
        </button>
      </div>
    </div>
    
    <!-- Progress Indicators -->
    <div class="card p-6 mb-8">
      <h2 class="h2 mb-4">Progress Indicators</h2>
      <div class="space-y-6">
        <div>
          <p class="text-sm mb-2">Progress Bar - Determinate</p>
          <ProgressBar value={75} max={100} meter="bg-primary-500" />
        </div>
        <div>
          <p class="text-sm mb-2">Progress Bar - Indeterminate</p>
          <ProgressBar value={undefined} meter="bg-secondary-500" />
        </div>
        <div class="flex gap-4">
          <div>
            <p class="text-sm mb-2">Progress Radial - 75%</p>
            <ProgressRadial value={75} stroke={120} meter="stroke-primary-500" track="stroke-surface-300" />
          </div>
          <div>
            <p class="text-sm mb-2">Loading Spinner</p>
            <ProgressRadial value={undefined} stroke={120} meter="stroke-secondary-500" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tabs Demo -->
    <div class="card p-6 mb-8">
      <h2 class="h2 mb-4">Tab Navigation</h2>
      <TabGroup>
        <Tab bind:group={activeTab} name="tab1" value={0}>
          <span><i class="fas fa-home mr-2"></i>Overview</span>
        </Tab>
        <Tab bind:group={activeTab} name="tab2" value={1}>
          <span><i class="fas fa-code mr-2"></i>Code</span>
        </Tab>
        <Tab bind:group={activeTab} name="tab3" value={2}>
          <span><i class="fas fa-palette mr-2"></i>Themes</span>
        </Tab>
        
        <svelte:fragment slot="panel">
          <div class="p-6">
            {#if activeTab === 0}
              <div class="space-y-4">
                <h3 class="h3">Overview</h3>
                <p>Skeleton UI provides production-ready components for Svelte applications.</p>
                <ul class="list-disc list-inside space-y-2 text-surface-600">
                  <li>Built for Svelte 5 and SvelteKit</li>
                  <li>Fully customizable with Tailwind CSS</li>
                  <li>Accessible by default (WCAG 2.1)</li>
                  <li>TypeScript support</li>
                  <li>9+ beautiful themes</li>
                </ul>
              </div>
            {:else if activeTab === 1}
              <div class="space-y-4">
                <h3 class="h3">Installation</h3>
                <pre class="code bg-surface-900 text-white p-4 rounded-lg">pnpm add -D @skeletonlabs/skeleton @skeletonlabs/tw-plugin</pre>
                <h3 class="h3 mt-6">Usage</h3>
                <pre class="code bg-surface-900 text-white p-4 rounded-lg">import &#123; AppBar, Card, Button &#125; from '@skeletonlabs/skeleton';</pre>
              </div>
            {:else if activeTab === 2}
              <div class="space-y-4">
                <h3 class="h3">Available Themes</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {#each ['skeleton', 'modern', 'rocket', 'seafoam', 'vintage', 'sahara'] as theme}
                    <div class="card p-4 text-center hover:scale-105 transition-transform cursor-pointer">
                      <div class="w-12 h-12 rounded-full mx-auto mb-2 bg-gradient-to-br from-primary-500 to-secondary-500"></div>
                      <p class="font-medium capitalize">{theme}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </svelte:fragment>
      </TabGroup>
    </div>
    
    <!-- Card Grid -->
    <div class="mb-8">
      <h2 class="h2 mb-6">Component Showcase</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonCard 
          title="Design System" 
          description="A complete design system with tokens, themes, and components."
          image="https://images.unsplash.com/photo-1558655146-d09347e92766?w=800"
          tags={["Design", "System", "UI"]}
        />
        <SkeletonCard 
          title="Accessible" 
          description="Built with accessibility in mind, following WCAG 2.1 guidelines."
          image="https://images.unsplash.com/photo-1557683304-673a23048d34?w=800"
          tags={["A11y", "WCAG", "Inclusive"]}
        />
        <SkeletonCard 
          title="Customizable" 
          description="Fully customizable with Tailwind CSS and design tokens."
          image="https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800"
          tags={["Tailwind", "Tokens", "CSS"]}
        />
      </div>
    </div>
    
    <!-- Modal Demo -->
    <div class="mb-8">
      <h2 class="h2 mb-6">Modals & Dialogs</h2>
      <SkeletonModalDemo />
    </div>
    
    <!-- Button Variants -->
    <div class="card p-6 mb-8">
      <h2 class="h2 mb-4">Button Variants</h2>
      <div class="space-y-6">
        <div>
          <p class="text-sm mb-3 font-medium">Filled</p>
          <div class="flex flex-wrap gap-2">
            <button class="btn variant-filled-primary">Primary</button>
            <button class="btn variant-filled-secondary">Secondary</button>
            <button class="btn variant-filled-tertiary">Tertiary</button>
            <button class="btn variant-filled-success">Success</button>
            <button class="btn variant-filled-warning">Warning</button>
            <button class="btn variant-filled-error">Error</button>
          </div>
        </div>
        <div>
          <p class="text-sm mb-3 font-medium">Soft</p>
          <div class="flex flex-wrap gap-2">
            <button class="btn variant-soft-primary">Primary</button>
            <button class="btn variant-soft-secondary">Secondary</button>
            <button class="btn variant-soft-success">Success</button>
            <button class="btn variant-soft-warning">Warning</button>
            <button class="btn variant-soft-error">Error</button>
          </div>
        </div>
        <div>
          <p class="text-sm mb-3 font-medium">Ghost</p>
          <div class="flex flex-wrap gap-2">
            <button class="btn variant-ghost-primary">Primary</button>
            <button class="btn variant-ghost-secondary">Secondary</button>
            <button class="btn variant-ghost-success">Success</button>
            <button class="btn variant-ghost-warning">Warning</button>
            <button class="btn variant-ghost-error">Error</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer CTA -->
    <div class="card p-12 text-center variant-ghost-primary">
      <h2 class="h2 mb-4">Ready to build amazing apps?</h2>
      <p class="text-surface-600 mb-6 max-w-xl mx-auto">
        Start using Skeleton UI in your next project and create beautiful, accessible interfaces in minutes.
      </p>
      <div class="flex justify-center gap-4">
        <a href="/studio" class="btn variant-filled-primary btn-lg">
          <i class="fas fa-rocket mr-2"></i>Go to Studio
        </a>
        <a href="https://skeleton.dev" target="_blank" class="btn variant-ghost-surface btn-lg">
          <i class="fas fa-external-link-alt mr-2"></i>Official Docs
        </a>
      </div>
    </div>
  </section>
</div>
