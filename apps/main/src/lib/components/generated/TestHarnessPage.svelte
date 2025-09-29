<script>
  import HeaderPro from './HeaderPro.svelte';
  import FooterPro from './FooterPro.svelte';
  import HeroSplit from './HeroSplit.svelte';
  import FeatureGridMinimal from './FeatureGridMinimal.svelte';
  import PricingTableSimple from './PricingTableSimple.svelte';
  import NewsletterSignup from './NewsletterSignup.svelte';
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
