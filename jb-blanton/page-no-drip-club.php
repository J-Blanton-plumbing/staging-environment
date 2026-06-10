<?php /* Template Name: No Drip Club */ get_header();
// --- 2026-04-20: ACF overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'JOIN THE NO DRIP CLUB';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: 'There are Good Calls—and then there\'s the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.';

$ndc_how_heading     = get_field( 'ndc_how_heading' )     ?: 'HOW IT WORKS';
$ndc_how_step1_label = get_field( 'ndc_how_step1_label' ) ?: 'SIGN UP TODAY';
$ndc_how_step1_text  = get_field( 'ndc_how_step1_text' )  ?: 'Join the NDC today and enjoy member benefits right away.';
$ndc_how_step2_label = get_field( 'ndc_how_step2_label' ) ?: 'CALL ANYTIME';
$ndc_how_step2_text  = get_field( 'ndc_how_step2_text' )  ?: 'Dial the exclusive members-only number for priority service 24/7/365.';
$ndc_how_step3_label = get_field( 'ndc_how_step3_label' ) ?: 'RELAX FOREVER';
$ndc_how_step3_text  = get_field( 'ndc_how_step3_text' )  ?: 'Rest easy knowing you\'re getting a good deal and even better service.';
$ndc_wait_heading    = get_field( 'ndc_wait_heading' )    ?: 'WHAT ARE YOU WAITING FOR?';
$ndc_wait_text       = get_field( 'ndc_wait_text' )       ?: 'Still not convinced? Need more info?';
?>
<div class="hero">
	<iframe class="img-s" src="https://www.youtube-nocookie.com/embed/F-dPAWZcyZE?controls=0&rel=0&fs=0" title="No Drip Club Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<div class="involveme_popup" data-project="no-drip-club" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me">Join Today</div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="cream"><div class="w81">
	<div class="ndc-card">
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/no-drip-club.webp" alt="NDC" />
		<div class="i">
			<p class="label">MEMBERS GET:</p>
			<div class="f"><div class="l">
				<p class="sub-label">SERIOUS SAVINGS</p>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>10% Discount (Includes Service and Equipment)*</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Additional Exclusive Membership Pricing</p></div>
				<p class="sub-label mt">VIP PEACE OF MIND</p>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>VIP Priority Scheduling (Guaranteed Within 24 Hours)</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>No Emergency Fees or Trip Charges</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>No After-Hours or Holiday Charges</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Extended Labor Warranty (From 1 to 5 Years)</p></div>
			</div><div class="r"><div>
				<p class="sub-label">COMPLIMENTARY HOME MAINTENANCE</p>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>1 Free Drain Clearing Per Year</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>1 Free Chemical Water Quality Analysis Per Year</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Free Annual Whole Home Plumbing Tune-Up</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Free Annual Sewer Camera Inspection</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Free Annual Water Heater Flush &amp; Maintenance</p></div>
				<div class="item"><div><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m5 13l4 4L19 7"/></svg></div><p>Free Annual Home Winterization</p></div>
				<p class="sub-label mt">All for just $29.97/month**</p>
				<p>*10% discount up to $500 per job, excluding membership pricing.</p>
				<p>Promotions and discounts are not stackable, and the higher value will be chosen.</p>
				<p>**Membership requires 12-month commitment.</p>
			</div></div></div>
		</div>
	</div>
	<div class="involveme_popup ndc-blue-button link-button" data-project="no-drip-club" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me">SIGN UP</div>
	<p class="red-text ndc-red-text-center"><?php echo esc_html( $ndc_how_heading ); ?></p>
	<div class="ndc-how-it-works">
		<div><p class="label"><?php echo esc_html( $ndc_how_step1_label ); ?></p><p class="text"><?php echo esc_html( $ndc_how_step1_text ); ?></p></div>
		<div><p class="label"><?php echo esc_html( $ndc_how_step2_label ); ?></p><p class="text"><?php echo esc_html( $ndc_how_step2_text ); ?></p></div>
		<div><p class="label"><?php echo esc_html( $ndc_how_step3_label ); ?></p><p class="text"><?php echo esc_html( $ndc_how_step3_text ); ?></p></div>
	</div>
	<div class="ndc-gr"><div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div></div>
	<div class="ndc-wait"><div>
		<p class="red-text"><?php echo esc_html( $ndc_wait_heading ); ?></p>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbers" />
		<p><?php echo esc_html( $ndc_wait_text ); ?></p>
		<div class="involveme_popup link-button" data-project="no-drip-club" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me">CONTACT US</div>
	</div>
	<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbers" /></div>
</div></div>
<?php get_footer(); ?>
