<?php
/**
 * Plugin Name:       Petunia AI – Chat de Ventas
 * Plugin URI:        https://aipetunia.com
 * Description:       Añade el chat de ventas con IA de Petunia a tu sitio web. Solo ingresa tu Business ID y listo.
 * Version:           1.0.0
 * Author:            Petunia AI
 * Author URI:        https://aipetunia.com
 * License:           GPL-2.0+
 * Text Domain:       petunia-chat
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ── Ajustes ───────────────────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
    add_options_page(
        'Petunia AI Chat',
        'Petunia AI Chat',
        'manage_options',
        'petunia-chat',
        'petunia_chat_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'petunia_chat', 'petunia_business_id',  [ 'sanitize_callback' => 'sanitize_text_field' ] );
    register_setting( 'petunia_chat', 'petunia_agent_name',   [ 'sanitize_callback' => 'sanitize_text_field', 'default' => 'Asistente' ] );
    register_setting( 'petunia_chat', 'petunia_color',        [ 'sanitize_callback' => 'sanitize_hex_color',  'default' => '#635bff' ] );
    register_setting( 'petunia_chat', 'petunia_position',     [ 'sanitize_callback' => 'sanitize_text_field', 'default' => 'right' ] );
    register_setting( 'petunia_chat', 'petunia_enabled',      [ 'sanitize_callback' => 'absint',              'default' => 1 ] );
} );

function petunia_chat_settings_page() {
    $business_id = get_option( 'petunia_business_id', '' );
    $agent_name  = get_option( 'petunia_agent_name',  'Asistente' );
    $color       = get_option( 'petunia_color',       '#635bff' );
    $position    = get_option( 'petunia_position',    'right' );
    $enabled     = get_option( 'petunia_enabled',     1 );
    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:28px;">🤖</span> Petunia AI – Chat de Ventas
        </h1>
        <p style="color:#666;margin-bottom:24px;">
            Configura tu agente de ventas con IA. Obtén tu Business ID en
            <a href="https://app.aipetunia.com/settings" target="_blank">app.aipetunia.com/settings</a>.
        </p>

        <?php if ( empty( $business_id ) ) : ?>
        <div class="notice notice-warning" style="padding:12px 16px;">
            <strong>⚠️ Ingresa tu Business ID</strong> para activar el chat.
        </div>
        <?php endif; ?>

        <form method="post" action="options.php" style="max-width:560px;">
            <?php settings_fields( 'petunia_chat' ); ?>

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="petunia_business_id">Business ID <span style="color:red">*</span></label></th>
                    <td>
                        <input type="text" id="petunia_business_id" name="petunia_business_id"
                               value="<?php echo esc_attr( $business_id ); ?>"
                               class="regular-text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                        <p class="description">Lo encuentras en Configuración → Integración dentro de Petunia AI.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="petunia_agent_name">Nombre del agente</label></th>
                    <td>
                        <input type="text" id="petunia_agent_name" name="petunia_agent_name"
                               value="<?php echo esc_attr( $agent_name ); ?>"
                               class="regular-text" placeholder="Asistente" />
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="petunia_color">Color principal</label></th>
                    <td>
                        <input type="color" id="petunia_color" name="petunia_color"
                               value="<?php echo esc_attr( $color ); ?>" />
                        <span style="margin-left:8px;color:#666;"><?php echo esc_html( $color ); ?></span>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Posición</th>
                    <td>
                        <label>
                            <input type="radio" name="petunia_position" value="right" <?php checked( $position, 'right' ); ?> />
                            Derecha
                        </label>
                        &nbsp;&nbsp;
                        <label>
                            <input type="radio" name="petunia_position" value="left" <?php checked( $position, 'left' ); ?> />
                            Izquierda
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Activar chat</th>
                    <td>
                        <label>
                            <input type="checkbox" name="petunia_enabled" value="1" <?php checked( $enabled, 1 ); ?> />
                            Mostrar el chat en el sitio
                        </label>
                    </td>
                </tr>
            </table>

            <?php submit_button( 'Guardar cambios' ); ?>
        </form>

        <?php if ( ! empty( $business_id ) ) : ?>
        <hr style="margin:32px 0 24px;" />
        <h2>Vista previa del código generado</h2>
        <pre style="background:#f0f0f0;padding:16px;border-radius:6px;font-size:13px;"><?php
            echo esc_html( '<script src="https://app.aipetunia.com/widget.js"' . "\n" .
                '  data-business-id="' . $business_id . '"' . "\n" .
                '  data-color="' . $color . '"' . "\n" .
                '  data-name="' . $agent_name . '"' . "\n" .
                '  data-position="' . $position . '"' . "\n" .
                '></script>' );
        ?></pre>
        <?php endif; ?>
    </div>
    <?php
}

// ── Inyección del widget en el footer ─────────────────────────────────────────

add_action( 'wp_footer', function () {
    $enabled     = get_option( 'petunia_enabled', 1 );
    $business_id = get_option( 'petunia_business_id', '' );

    if ( ! $enabled || empty( $business_id ) ) return;

    $color    = get_option( 'petunia_color',    '#635bff' );
    $name     = get_option( 'petunia_agent_name', 'Asistente' );
    $position = get_option( 'petunia_position', 'right' );

    printf(
        '<script src="https://app.aipetunia.com/widget.js" data-business-id="%s" data-color="%s" data-name="%s" data-position="%s"></script>' . "\n",
        esc_attr( $business_id ),
        esc_attr( $color ),
        esc_attr( $name ),
        esc_attr( $position )
    );
}, 100 );
