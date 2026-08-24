                        {user.is_verified && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>VERIFIED</span>}
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: C.muted }}>{user.email}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: C.sunk, border: `1px solid ${C.line}`, color: C.muted, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>
                          {roleLabel[user.role] || user.role || 'No role'}
                        </span>
                        <span style={{
                          background: user.verification_status === 'approved' ? '#1a2e1d' : user.verification_status === 'rejected' ? C.dangerSoft : C.sunk,
                          color: user.verification_status === 'approved' ? C.oasis : user.verification_status === 'rejected' ? C.danger : C.muted,
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px'
                        }}>
                          {user.verification_status || 'pending'}
                        </span>
                        {user.documents_submitted && <span style={{ background: '#1a2e1d', color: C.oasis, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>Docs Submitted</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleSelect(user)}
                    style={{ background: selected?.id === user.id ? C.clay : 'transparent', border: `1px solid ${selected?.id === user.id ? C.clay : C.line}`, color: selected?.id === user.id ? C.sunk : C.muted, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {selected?.id === user.id ? 'Close' : 'Review'}
                  </button>
                </div>

                {selected?.id === user.id && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { label: 'Phone', value: user.phone },
                        { label: 'City', value: user.city },
                        { label: 'State', value: user.state },
                        { label: 'Company', value: user.company_name },
                        { label: 'Experience', value: user.experience_years ? `${user.experience_years} yrs` : null },
                        { label: 'Professional Body', value: user.professional_body },
                        { label: 'License No.', value: user.professional_license_number },
                        { label: 'CAC No.', value: user.cac_number },
                      ].filter(f => f.value).map(field => (
                        <div key={field.label} style={{ background: C.sunk, padding: '10px 12px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: C.text, fontWeight: '600' }}>{field.value}</p>
                        </div>
                      ))}
                    </div>

                    {user.bio && (
                      <div style={{ background: C.sunk, padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.muted, fontWeight: '600', textTransform: 'uppercase' }}>Bio</p>
                        <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: '1.6' }}>{user.bio}</p>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '10px' }}>Documents</p>
                      {loadingDocs ? <p style={{ color: C.muted, fontSize: '13px' }}>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {docUrls.id ? (
                            <a href={docUrls.id} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>🪪</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>Government ID</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          ) : <div style={{ background: C.sunk, padding: '14px', borderRadius: '8px' }}><p style={{ margin: 0, fontSize: '13px', color: C.muted }}>No government ID uploaded</p></div>}

                          {user.cac_document_url && docUrls.cac && (
                            <a href={docUrls.cac} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>🏢</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>CAC Certificate</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          )}

                          {user.professional_license_url && docUrls.license && (
                            <a href={docUrls.license} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.sunk, padding: '14px', borderRadius: '8px', textDecoration: 'none', border: `1px solid ${C.line}` }}>
                              <span>📋</span>
                              <div><p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: C.text }}>Professional License</p><p style={{ margin: 0, fontSize: '12px', color: C.clay }}>Click to view →</p></div>
                            </a>
                          )}

                          {!user.id_document_url && !user.cac_document_url && !user.professional_license_url && (
                            <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>No documents uploaded yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.muted, marginBottom: '6px', textTransform: 'uppercase' }}>Admin Note (shown to user)</label>
                      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for approval or rejection..." style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleVerify(user.id, 'approved')} style={{ background: C.oasis, color: C.sunk, border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✓ Approve</button>
                      <button onClick={() => handleVerify(user.id, 'rejected')} style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.danger}`, padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✕ Reject</button>
                      <button onClick={() => handleVerify(user.id, 'pending')} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Reset</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'pending' && pendingVerification.length === 0 && (
              <div style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: '15px', margin: 0 }}>No pending verifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}