<?php
/**
 * Single template for jb_faq CPT.
 * URL: /faq/{slug}/
 */
get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id  = get_the_ID();
$answer   = get_post_meta( $post_id, '_jb_faq_answer', true ) ?: get_the_content();
$service  = get_post_meta( $post_id, '_jb_faq_service', true );
$city     = get_post_meta( $post_id, '_jb_faq_city', true );

// Related FAQs from same service category
$related = get_posts( [
	'post_type'      => 'jb_faq',
	'post_status'    => 'publish',
	'posts_per_page' => 5,
	'post__not_in'   => [ $post_id ],
	'meta_query'     => [ [ 'key' => '_jb_faq_service', 'value' => $service, 'compare' => '=' ] ],
] );
?>

<div class="page-hero hero">
	<div class="hero-contents w81">
		<h1><?php the_title(); ?></h1>
	</div>
</div>

<div class="hero-nav">
	<a href="<?php echo esc_url( home_url( '/emergency-plumbing' ) ); ?>">EMERGENCY PLUMBING</a>
	<a href="<?php echo esc_url( home_url( '/knowledge-hub' ) ); ?>">KNOWLEDGE HUB</a>
	<a href="<?php echo esc_url( home_url( '/financing' ) ); ?>">FINANCING</a>
	<a href="<?php echo esc_url( home_url( '/help-and-support' ) ); ?>">HELP &amp; SUPPORT</a>
</div>

<div class="cream">
	<div class="w81 emergecy-plumbing">

		<?php if ( $service ) : ?>
		<p class="red-text" style="margin-bottom:8px;"><?php echo esc_html( strtoupper( $service ) ); ?></p>
		<?php endif; ?>

		<div class="page-content faq-answer" style="margin-bottom:40px;">
			<?php echo wp_kses_post( $answer ); ?>
		</div>

		<?php if ( ! empty( $related ) ) : ?>
		<div class="faqs related-faqs">
			<p class="red-text2" style="margin-bottom:20px;">RELATED QUESTIONS</p>
			<?php foreach ( $related as $idx => $faq ) : ?>
			<div class="faq">
				<div id="rfaq-head<?php echo $idx; ?>" class="head">
					<p><?php echo esc_html( $faq->post_title ); ?></p>
					<div class="svg">
						<svg id="radd<?php echo $idx; ?>" class="add" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M13 6a1 1 0 1 0-2 0v5H6a1 1 0 1 0 0 2h5v5a1 1 0 1 0 2 0v-5h5a1 1 0 1 0 0-2h-5z"/></svg>
					</div>
					<div class="svg minus">
						<svg id="rminus<?php echo $idx; ?>" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/></svg>
					</div>
				</div>
				<div id="rfaq-content<?php echo $idx; ?>" class="faq-content">
					<p><?php echo wp_kses_post( get_post_meta( $faq->ID, '_jb_faq_answer', true ) ?: $faq->post_content ); ?></p>
					<a href="<?php echo esc_url( get_permalink( $faq->ID ) ); ?>" style="margin-top:8px;display:inline-block;">Read full answer →</a>
				</div>
			</div>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>

	</div>
</div>

<div class="cream-bottom w81">
	<div class="involveme_popup link-button"
		data-project="schedule-service-new"
		data-embed-mode="popup"
		data-trigger-event="button"
		data-popup-size="medium"
		data-organization-url="https://jblantonplumbing.involve.me"
		style="display:inline-flex;margin:40px 0;"
	><p>SCHEDULE A SERVICE</p></div>
</div>

<script>
(() => {
	document.querySelectorAll(".related-faqs .faq").forEach((v, i) => {
		let clicked = false;
		const add = document.getElementById(`radd${i}`);
		const minus = document.getElementById(`rminus${i}`);
		const head = document.getElementById(`rfaq-head${i}`);
		const content = document.getElementById(`rfaq-content${i}`);
		if (!head || !content) return;
		const prevH = `${head.offsetHeight}px`;
		v.style.height = prevH;
		v.addEventListener("click", () => {
			clicked = !clicked;
			v.style.height = clicked ? `${content.offsetHeight + 70}px` : prevH;
			if (add) add.style.display = clicked ? "none" : "block";
			if (minus) minus.style.display = clicked ? "block" : "none";
		});
	});
})();
</script>

<?php endwhile; endif; ?>
<?php get_footer(); ?>
