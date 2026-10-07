/**
 * Tela de autenticação (RF08).
 *
 * Login pelo gateway de identidade; quando ele não está disponível, o acesso é
 * validado nas contas de demonstração (uma por perfil) — cada perfil entra
 * direto no próprio conjunto de páginas.
 */

import { html } from '../utils/html.js';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_INFO, ROLES } from '../config/roles.js';
import { icon } from '../components/icons.js';
import { badge, button, logo } from '../components/ui.js';

const AUTH_POINTS = [
  'Monitoramento de sensores via ThingSpeak',
  'Previsões de colheita e janela de exportação',
  'Qualidade dos dados e trilha de auditoria',
];

const backToLogin = html`<button type="button" class="back-link" data-action="auth-mode" data-mode="login">← Voltar ao login</button>`;

function errorBox(state) {
  if (!state.authError) return '';
  return html`<div class="auth-error">${icon('alert-triangle', 16)}<span>${state.authError}</span></div>`;
}

function loginForm(state) {
  const demoButtons = DEMO_ACCOUNTS.map(
    (account) => html`<button type="button" data-action="demo-login" data-email="${account.email}">
      <strong>${ROLE_INFO[account.role].label}</strong>
      <small>${account.email}</small>
    </button>`,
  );

  return html`<div class="auth-heading">
      <span class="overline">Acesso à plataforma</span>
      <h1>Bem-vindo ao AgroClima Cloud</h1>
      <p>Monitoramento climático e logístico para exportadoras de frutas do Vale do São Francisco.</p>
    </div>
    ${errorBox(state)}
    <form data-form="login">
      <label class="field"><span>E-mail</span><input name="email" type="email" value="${state.loginEmail ?? ''}" placeholder="nome@empresa.com" autocomplete="username" required /></label>
      <label class="field"><span>Senha</span>
        <div class="input-icon"><input name="password" type="password" placeholder="Digite sua senha" autocomplete="current-password" required />${icon('eye')}</div>
      </label>
      <div class="form-meta">
        <label><input type="checkbox" checked />Lembrar de mim</label>
        <button type="button" data-action="auth-mode" data-mode="forgot">Esqueci minha senha</button>
      </div>
      ${button(state.authBusy ? 'Entrando…' : 'Entrar na plataforma', { type: 'submit', disabled: state.authBusy })}
    </form>
    <div class="demo-access"><span>Acessos independentes para demonstração (senha ${DEMO_PASSWORD})</span>${demoButtons}</div>
    <div class="signup-link">Ainda não tem uma conta? <button type="button" data-action="auth-mode" data-mode="signup">Solicitar acesso</button></div>`;
}

function textField({ label, name, placeholder, type = 'text', required = true }) {
  return html`<label class="field"><span>${label}</span><input name="${name}" type="${type}" placeholder="${placeholder}"${required ? html` required` : ''} /></label>`;
}

function signupForm() {
  const roleOptions = Object.values(ROLES).map((role) => html`<option value="${role}">${ROLE_INFO[role].label}</option>`);
  return html`${backToLogin}
    <div class="auth-heading"><h1>Solicitar acesso</h1><p>O cadastro é registrado como “Aguardando aprovação” e liberado pelo administrador.</p></div>
    <form data-form="signup">
      <div class="form-grid">
        ${textField({ label: 'Nome completo', name: 'name', placeholder: 'Seu nome' })}
        ${textField({ label: 'E-mail', name: 'email', placeholder: 'nome@empresa.com', type: 'email' })}
        ${textField({ label: 'Telefone', name: 'phone', placeholder: '(87) 99999-0000', required: false })}
        ${textField({ label: 'Empresa', name: 'company', placeholder: 'Nome da empresa', required: false })}
        ${textField({ label: 'Cargo', name: 'jobTitle', placeholder: 'Seu cargo', required: false })}
        <label class="field"><span>Perfil desejado</span><select name="role">${roleOptions}</select></label>
        ${textField({ label: 'Senha', name: 'password', placeholder: 'Mínimo 6 caracteres', type: 'password' })}
        ${textField({ label: 'Confirmar senha', name: 'confirmPassword', placeholder: 'Repita a senha', type: 'password' })}
      </div>
      <label class="terms"><input type="checkbox" required />Li e aceito os Termos de Uso e a Política de Privacidade (LGPD/GDPR).</label>
      ${button('Enviar solicitação', { type: 'submit' })}
    </form>`;
}

function forgotForm() {
  return html`${backToLogin}
    <div class="auth-heading">
      <div class="recover-icon">${icon('lock')}</div>
      <h1>Esqueci minha senha</h1>
      <p>Informe seu e-mail e enviaremos um link seguro para criar uma nova senha.</p>
    </div>
    <form data-form="forgot">${textField({ label: 'E-mail', name: 'email', placeholder: 'nome@empresa.com', type: 'email' })}${button('Enviar link de recuperação', { type: 'submit' })}</form>`;
}

/** Conteúdo interno do cartão de autenticação, conforme o modo atual. */
export function authFormContent(state) {
  if (state.authMode === 'signup') return signupForm();
  if (state.authMode === 'forgot') return forgotForm();
  return loginForm(state);
}

function visualPanel() {
  return html`<div class="auth-visual">
    ${logo({ light: true })}
    <div class="auth-art">
      <div class="orbit orbit-a"><span>${icon('cloud')}</span></div>
      <div class="orbit orbit-b"><span>${icon('thermo')}</span></div>
      <div class="grape-cluster">${Array.from({ length: 10 }, () => html`<i></i>`)}</div>
      <div class="sensor-card">${icon('wifi')}<div><span>Sensor THS-ESP32-04</span><strong>28,4 °C · 67%</strong></div>${badge('Online')}</div>
    </div>
    <div class="auth-message">
      <span>Inteligência para o Vale do São Francisco</span>
      <h2>Do clima ao mercado.<br />Decisões no tempo certo.</h2>
      <p>Dados de sensores IoT, previsões de colheita e mercado em uma única plataforma.</p>
      <div class="auth-points">${AUTH_POINTS.map((point) => html`<span>${icon('check')}${point}</span>`)}</div>
    </div>
  </div>`;
}

export function authView(state) {
  return html`<div class="auth-shell">
    ${visualPanel()}
    <main class="auth-form-wrap">
      <div class="mobile-logo">${logo()}</div>
      <div class="auth-form">${authFormContent(state)}</div>
      <p class="auth-footer">© ${new Date().getFullYear()} AgroClima Cloud · Projeto Integrador ADS · v${'2.0.0'}</p>
    </main>
  </div>`;
}
