<script>
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  
  function triggerWelcomeModal() {
    modalStore.trigger({
      type: 'alert',
      title: '🎉 Welcome to Skeleton UI!',
      body: 'This is a beautiful modal built with Skeleton UI components. It features smooth animations, responsive design, and full accessibility support.',
      buttonTextConfirm: 'Got it!'
    });
  }
  
  function triggerConfirmModal() {
    modalStore.trigger({
      type: 'confirm',
      title: '⚠️ Confirm Action',
      body: 'Are you sure you want to proceed with this action? This cannot be undone.',
      buttonTextConfirm: 'Yes, proceed',
      buttonTextCancel: 'Cancel',
      response: (r) => {
        if (r) {
          modalStore.trigger({
            type: 'alert',
            title: '✅ Success!',
            body: 'Action completed successfully.'
          });
        }
      }
    });
  }
</script>

<div class="space-y-4">
  <div class="card p-6 variant-ghost-primary">
    <h3 class="h3 mb-4">🎭 Modal Demos</h3>
    <p class="text-surface-600 mb-6">
      Explore different modal types with Skeleton UI
    </p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Alert Modal -->
      <button 
        class="btn variant-filled-primary h-24 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"
        on:click={triggerWelcomeModal}
      >
        <i class="fas fa-info-circle text-2xl"></i>
        <span>Alert Modal</span>
      </button>
      
      <!-- Confirm Modal -->
      <button 
        class="btn variant-filled-warning h-24 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"
        on:click={triggerConfirmModal}
      >
        <i class="fas fa-exclamation-triangle text-2xl"></i>
        <span>Confirm Modal</span>
      </button>
    </div>
  </div>
</div>

<!-- Modal Component (place once in layout) -->
<Modal />
