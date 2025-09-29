<script>
  import FeatureGridMinimal from './FeatureGridMinimal.svelte';
  import FooterPro from './FooterPro.svelte';
  import HeaderPro from './HeaderPro.svelte';
  import HeroSplit from './HeroSplit.svelte';
  import NewsletterSignup from './NewsletterSignup.svelte';
  import PricingTableSimple from './PricingTableSimple.svelte';
</script>

<div class="min-h-screen flex flex-col">
  <HeaderPro />
  <main class="flex-1 space-y-16">
    <HeroSplit />
    <FeatureGridMinimal />
    <PricingTableSimple />
    <NewsletterSignup />
  </main>
  <FooterPro />
</div>
