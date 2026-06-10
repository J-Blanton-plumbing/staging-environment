<?php /* Template Name: Knowledge Hub */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'KNOWLEDGE HUB';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: '';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/kh-hero.jpg' );

$cf_faqs = get_posts(['post_type'=>'jb_faq','post_status'=>'publish','posts_per_page'=>3,'orderby'=>'rand']);
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="KH Hero" />
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
<div class="cream"><div class="kh">
	<div class="align1">
		<p class="red-text">HELPFUL ARTICLES</p>
		<div>
			<p>Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.</p>
			<a class="link-button" href="<?php echo esc_url(home_url('/services')); ?>">VIEW SERVICES</a>
		</div>
	</div>
	<div class="articles-nav">
		<div id="arrow-left" class="button disabled">
			<div id="svgleft"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg></div>
			<p id="back">Back</p>
		</div>
		<div id="arrow-right" class="button">
			<p id="next">Next</p>
			<div id="svgright"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg></div>
		</div>
	</div>
	<div id="kh-articles" hx-trigger="load" hx-get="/articles/9/0" hx-swap="innerHTML"></div>
	<?php if (!empty($cf_faqs)): ?>
	<div class="faqs">
		<div class="l">
			<p class="red-text">FAQ</p>
			<p>Got questions? Whether you're curious about our services, need tips for maintaining your plumbing, or want to know what sets J. Blanton Plumbing apart, you'll find the answers right here.</p>
		</div>
		<div class="r">
		<?php foreach ($cf_faqs as $idx => $faq): ?>
			<div class="faq not-active">
				<div class="ii">
					<p class="label"><?php echo esc_html($faq->post_title); ?></p>
					<div id="right-arrow<?php echo $idx; ?>"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m10 17l5-5l-5-5"/></svg></div>
					<div class="bottom-arrow" id="bottom-arrow<?php echo $idx; ?>"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19 9l-7 6l-7-6"/></svg></div>
				</div>
				<p id="faq-desc<?php echo $idx; ?>" class="faq-desc"><?php echo wp_kses_post($faq->post_content ?: get_post_meta($faq->ID, '_jb_faq_answer', true)); ?></p>
			</div>
		<?php endforeach; ?>
		</div>
	</div>
	<script>
	(() => {
		const faqs = document.querySelectorAll('.kh .faq');
		faqs.forEach((faq, i) => {
			const ii = faq.querySelector('.ii');
			const desc = document.getElementById('faq-desc' + i);
			const ra = document.getElementById('right-arrow' + i);
			const ba = document.getElementById('bottom-arrow' + i);
			if (!ii || !desc) return;
			ii.addEventListener('click', () => {
				const isOpen = faq.classList.contains('active');
				faqs.forEach((f, j) => {
					f.classList.remove('active'); f.classList.add('not-active');
					const d = document.getElementById('faq-desc' + j);
					const r = document.getElementById('right-arrow' + j);
					const b = document.getElementById('bottom-arrow' + j);
					if (d) d.style.display = 'none';
					if (r) r.style.display = 'block';
					if (b) b.style.display = 'none';
				});
				if (!isOpen) {
					faq.classList.remove('not-active'); faq.classList.add('active');
					desc.style.display = 'block';
					if (ra) ra.style.display = 'none';
					if (ba) ba.style.display = 'block';
				}
			});
		});
	})();
	</script>
	<?php endif; ?>
	<div class="kh-gr"><div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div></div>
</div></div>
<script>
	(() => {
		const left = document.getElementById("arrow-left");
		const right = document.getElementById("arrow-right");
		const back = document.getElementById("back");
		const next = document.getElementById("next");
		const svgleft = document.getElementById("svgleft");
		const svgright = document.getElementById("svgright");
		let n = 0;
		let disabled = false;

		const loadingText = () => {
			back.innerHTML = "Loading...";
			next.innerHTML = "Loading...";
			svgleft.style.display = "none";
			svgright.style.display = "none";
		};

		left.addEventListener("click", () => {
			if (left.classList.contains("disabled") || disabled) return;
			disabled = true;
			loadingText();
			n--;
			if (n === 0) left.classList.add("disabled");
			htmx.ajax("GET", `/articles/9/${n}`, { swap: "innerHTML", target: "#kh-articles" });
		});

		right.addEventListener("click", () => {
			if (disabled) return;
			disabled = true;
			loadingText();
			n++;
			if (n > 0) left.classList.remove("disabled");
			htmx.ajax("GET", `/articles/9/${n}`, { swap: "innerHTML", target: "#kh-articles" });
		});

		document.body.addEventListener("htmx:afterRequest", () => {
			if (disabled) {
				disabled = false;
				back.innerHTML = "Back";
				next.innerHTML = "Next";
				svgleft.style.display = "block";
				svgright.style.display = "block";
			}
		});
	})();
</script>
<?php get_footer(); ?>
