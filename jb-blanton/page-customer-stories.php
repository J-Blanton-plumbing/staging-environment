<?php /* Template Name: Customer Stories */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'SEE WHAT OUR CUSTOMERS ARE SAYING';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: 'Real reviews from real customers - we are proud to share their experience.';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/header_custumer.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Customer S Hero" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE A SERVICE</p></div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="testimonials-grid"><div class="testimonials-container">
<?php
$testimonials = [
	['img'=>'0mar.webp','name'=>'Omar U.','text'=>'Alex was fantastic - explained everything really well, talked me through a leak issue in my shower, gave me options and communicated effectively with my building maintenance team. Really put my mind at ease!'],
	['img'=>'j0sep.webp','name'=>'Joseph C.','text'=>'Very informative and professional. Greatly appreciated the time spent.'],
	['img'=>'j0rg.webp','name'=>'Jorge D.','text'=>'Christian was fantastic! He\'s been here a few times for no drip club visits and he\'s the man! Did our tankless water heater maintenance and was friendly and efficient, highly recommend'],
	['img'=>'header_custumer.webp','name'=>'Benjamin F.','text'=>'Great experience. Trust 100%. Great prices and super knowledgable. Pic of me and my man Ron below! #satisfied #relieved #happy'],
	['img'=>'s4m.webp','name'=>'Samantha F.','text'=>'Arrived timely and took their time reviewing all of my concerns. Bryan explained his findings clearly and was transparent with pricing. He made sure to walk through next steps and ensure everything was set. Highly recommend!'],
	['img'=>'j4s.webp','name'=>'Jason K.','text'=>'Christian came out today, even though it was passed 5 he still made the trip. Super friendly and got the water heater taken care of quick.'],
	['img'=>'ge0.webp','name'=>'George S.','text'=>'Ron is the man! He not only walked us through our reason for calling which was a leak in a ceiling but was gracious to answer all the questions we had in a multiple unit condo (which was a lot). Highly recommend and a constant customer going forward!'],
];
$review_url = 'https://www.google.com/search?q=J+Blanton+Plumbing+Chicago&ludocid=13338365584811630957#lrd=0x880fd23cbc97c273:0xb91b64d466fe216d,3';
foreach($testimonials as $t): ?>
<a href="<?php echo esc_url($review_url); ?>" target="_blank" rel="noopener noreferrer" class="testimonial-card">
	<img src="https://d1rplazj5a80fb.cloudfront.net/images/<?php echo esc_attr($t['img']); ?>" alt="Customer" />
	<div class="testimonial-card-content">
		<p class="testimonial-name"><?php echo esc_html($t['name']); ?></p>
		<p class="testimonial-stars">★★★★★</p>
		<p class="testimonial-text"><?php echo esc_html($t['text']); ?></p>
	</div>
</a>
<?php endforeach; ?>
</div></div>
<div class="behind-the-review-section"><div class="behind-the-review-container">
	<h2 class="behind-the-review-title">BEHIND THE REVIEW:</h2>
	<div class="video-container"><iframe src="https://www.youtube.com/embed/m8iTyK0vrr8" title="Behind the Review" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
</div></div>
<div class="google-reviews-section"><div class="google-reviews-container">
	<div class="elfsight-app-266c99c1-530c-4f93-8046-bab90e4a05e5" data-elfsight-app-lazy></div>
	<div class="google-reviews-header">
		<a href="<?php echo esc_url($review_url); ?>" target="_blank" rel="noopener noreferrer" class="google-reviews-button">Review us on Google</a>
	</div>
</div></div>
<div class="call-to-action-section"><div class="call-to-action-container">
	<h2>Need a trusted plumber in Chicago?</h2>
	<p>Join thousands of satisfied customers who trust J. Blanton Plumbing for their plumbing needs.</p>
	<a href="tel:773-724-9272" class="call-to-action-button"><div class="phone-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div><span>Call Now: 773-724-9272</span></a>
</div></div>
<?php get_footer(); ?>
