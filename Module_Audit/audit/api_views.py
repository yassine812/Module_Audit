from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
import json
from .models import TypeAudit, TextRef, ChapitreNorme, Critere, SousCritere, TypePreuve, TypeCotation, Cotation, FormulaireAudit, ListeAudit, ResultatAudit, PreuveAttendu, SousCritereTypeAudit, FormulaireSousCritere, DetailResultatAudit, EvidenceAudit
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.db.models import Q, Avg, Count


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                role = 'Participant'
                if user.is_superuser:
                    role = 'Admin'
                elif user.groups.filter(name='Auditeur').exists():
                    role = 'Auditeur'
                
                return JsonResponse({
                    'status': 'success',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': role
                    }
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'Identifiants invalides'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutAPIView(View):
    def post(self, request):
        logout(request)
        return JsonResponse({'status': 'success', 'message': 'Logged out successfully'})


@method_decorator(csrf_exempt, name='dispatch')
class ChangePasswordAPIView(View):
    def post(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Non authentifié'}, status=401)
        try:
            data = json.loads(request.body)
            old_password = data.get('old_password')
            new_password = data.get('new_password')
            
            if not request.user.check_password(old_password):
                return JsonResponse({'status': 'error', 'message': 'Ancien mot de passe incorrect'}, status=400)
            
            request.user.set_password(new_password)
            request.user.save()
            # We need to re-login the user because changing password invalidates the session
            login(request, request.user)
            
            return JsonResponse({'status': 'success', 'message': 'Mot de passe modifié avec succès'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class UserListAPIView(View):
    def get(self, request):
        from django.contrib.auth.models import User
        users = User.objects.all()
        data = []
        for u in users:
            role = 'Participant'
            if u.is_superuser:
                role = 'Admin'
            elif u.groups.filter(name='Auditeur').exists():
                role = 'Auditeur'
            
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': role
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        from django.contrib.auth.models import User
        try:
            data = json.loads(request.body)
            user = User.objects.create_user(
                username=data['username'],
                email=data.get('email', ''),
                password='password123' # Default password
            )
            # Handle role
            role = data.get('role', 'Participant')
            if role == 'Admin':
                user.is_superuser = True
                user.is_staff = True
            elif role == 'Auditeur':
                from django.contrib.auth.models import Group
                group, _ = Group.objects.get_or_create(name='Auditeur')
                user.groups.add(group)
            user.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': role
                }
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)








@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_audits = TypeAudit.objects.prefetch_related('section').all()
        data = []
        for ta in type_audits:
            sections = list(ta.section.values('id', 'name'))
            section_names = ", ".join([s['name'] for s in sections])
            data.append({
                'id': ta.id,
                'name': ta.name,
                'sections': sections,
                'section_names': section_names or '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            type_audit = TypeAudit.objects.create(name=data['name'])
            if data.get('sections'):
                type_audit.section.set(data['sections'])
            
            sections = list(type_audit.section.values('id', 'name'))
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name,
                    'sections': sections,
                    'section_names': ", ".join([s['name'] for s in sections]) or '-'
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditDetailAPIView(View):
    def get(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
    
    def put(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            data = json.loads(request.body)
            
            type_audit.name = data.get('name', type_audit.name)
            type_audit.save()

            if 'section' in data:
                type_audit.section.set(data['section'])
            
            sections = list(type_audit.section.values('id', 'name'))
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name,
                    'sections': sections,
                    'section_names': ", ".join([s['name'] for s in sections]) or '-'
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    def delete(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            type_audit.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class ChapitreNormeListAPIView(View):
    def get(self, request):
        qs = ChapitreNorme.objects.select_related('text_ref').all()
        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'name': c.name,
                'text_ref_id': c.text_ref.id if c.text_ref else None,
                'text_ref_norme': c.text_ref.norme if c.text_ref else 'N/A',
                'page': c.page
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            chapitre = ChapitreNorme.objects.create(
                name=data['name'],
                text_ref_id=data['text_ref'],
                page=data.get('page')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': chapitre.id,
                    'name': chapitre.name,
                    'text_ref': chapitre.text_ref.id if chapitre.text_ref else None,
                    'text_ref_norme': chapitre.text_ref.norme if chapitre.text_ref else 'N/A',
                    'page': chapitre.page
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class ChapitreNormeDetailAPIView(View):
    def get(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': c.id,
                    'name': c.name,
                    'text_ref': c.text_ref.id if c.text_ref else None,
                    'page': c.page
                }
            })
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            data = json.loads(request.body)
            c.name = data.get('name', c.name)
            c.text_ref_id = data.get('text_ref', c.text_ref_id)
            c.page = data.get('page', c.page)
            c.save()
            return JsonResponse({'status': 'success', 'message': 'Updated successfully'})
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class CritereListAPIView(View):
    def get(self, request):
        qs = Critere.objects.select_related('chapitre_norme', 'formulaire').all()
        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'name': c.name,
                'chapitre_norme_id': c.chapitre_norme.id if c.chapitre_norme else None,
                'chapitre_norme_name': c.chapitre_norme.name if c.chapitre_norme else '-',
                'formulaire_id': c.formulaire.id if c.formulaire else None,
                'formulaire_name': c.formulaire.name if c.formulaire else '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists (only if provided)
            chapitre_id = data.get('chapitre_norme') or data.get('chapitre_id')
            if chapitre_id:
                try:
                    ChapitreNorme.objects.get(id=chapitre_id)
                except ChapitreNorme.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'ChapitreNorme with id {chapitre_id} does not exist'}, status=400)
            
            critere = Critere.objects.create(
                name=data.get('name') or data.get('nom'),
                chapitre_norme_id=chapitre_id,
                formulaire_id=data.get('formulaire') or data.get('formulaire_id')
            )
            if 'type_audit' in data:
                critere.type_audit.set(data['type_audit'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': critere.id,
                    'name': critere.name,
                    'chapitre_norme_id': critere.chapitre_norme.id if critere.chapitre_norme else None,
                    'chapitre_norme_name': critere.chapitre_norme.name if critere.chapitre_norme else '-',
                    'formulaire_id': critere.formulaire.id if critere.formulaire else None,
                    'formulaire_name': critere.formulaire.name if critere.formulaire else '-'
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class CritereDetailAPIView(View):
    def get(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': c.id,
                    'name': c.name,
                    'chapitre_norme': c.chapitre_norme.id if c.chapitre_norme else None,
                    'formulaire': c.formulaire.id if c.formulaire else None
                }
            })
        except Critere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            data = json.loads(request.body)
            c.name = data.get('name') or data.get('nom') or c.name
            chap_id = data.get('chapitre_norme') or data.get('chapitre_id')
            if chap_id:
                c.chapitre_norme_id = chap_id
            form_id = data.get('formulaire') or data.get('formulaire_id')
            if form_id:
                c.formulaire_id = form_id
            c.save()
            
            if 'type_audit' in data:
                c.type_audit.set(data['type_audit'])
                
            return JsonResponse({'status': 'success', 'message': 'Updated successfully'})
        except Critere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            Critere.objects.get(pk=pk).delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except Critere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            data = json.loads(request.body)
            c.name = data.get('name', c.name)
            if 'chapitre_norme' in data: c.chapitre_norme_id = data['chapitre_norme']
            if 'formulaire' in data: c.formulaire_id = data['formulaire']
            c.save()
            if 'type_audit' in data:
                c.type_audit.set(data['type_audit'])
            return JsonResponse({'status': 'success', 'data': {'id': c.id, 'name': c.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeCotationListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_cotations = TypeCotation.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_cotations)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_cotation = TypeCotation.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_cotation.id,
                    'name': type_cotation.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        qs = SousCritere.objects.all().select_related('critere', 'type_cotation').prefetch_related('preuve_attendu', 'critere__type_audit')
        data = []
        for sc in qs:
            data.append({
                'id': sc.id,
                'content': sc.content,
                'reaction': sc.reaction,
                'critere_id': sc.critere.id,
                'critere_name': sc.critere.name,
                'type_cotation_id': sc.type_cotation.id if sc.type_cotation else None,
                'type_cotation_name': sc.type_cotation.name if sc.type_cotation else '-',
                'preuves_attendues': list(sc.preuve_attendu.values('id', 'name')),
                'type_audits': list(sc.critere.type_audit.values('id', 'name')),
                'type_audit_names': ", ".join([t.name for t in sc.critere.type_audit.all()])
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            crit_id = data.get('critere') or data.get('critere_id') or data.get('crit_id')
            # Validate foreign key exists
            try:
                Critere.objects.get(id=crit_id)
            except Critere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Critere with id {crit_id} does not exist'}, status=400)
            
            # Optional: validate type_cotation if provided
            cot_id = data.get('type_cotation') or data.get('cotation_id') or data.get('cotation')
            if cot_id:
                try:
                    TypeCotation.objects.get(id=cot_id)
                except TypeCotation.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypeCotation with id {cot_id} does not exist'}, status=400)
            
            sous_critere = SousCritere.objects.create(
                content=data.get('content') or data.get('nom') or data.get('libelle'),
                critere_id=crit_id,
                reaction=data.get('reaction', ''),
                type_cotation_id=cot_id
            )
            if 'preuves_attendues' in data or 'preuve_attendu' in data:
                preuves = data.get('preuves_attendues') or data.get('preuve_attendu')
                sous_critere.preuve_attendu.set(preuves)
            if 'type_audit' in data:
                for ta_id in data['type_audit']:
                    SousCritereTypeAudit.objects.get_or_create(sous_critere=sous_critere, type_audit_id=ta_id)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere.id,
                    'content': sous_critere.content,
                    'reaction': sous_critere.reaction,
                    'critere': sous_critere.critere.id,
                    'critere_name': sous_critere.critere.name,
                    'type_cotation': sous_critere.type_cotation.id if sous_critere.type_cotation else None,
                    'type_cotation_name': sous_critere.type_cotation.name if sous_critere.type_cotation else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereDetailAPIView(View):
    def get(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sc.id,
                    'content': sc.content,
                    'reaction': sc.reaction,
                    'critere_id': sc.critere.id,
                    'type_cotation_id': sc.type_cotation.id if sc.type_cotation else None,
                    'preuves_attendues_ids': list(sc.preuve_attendu.values_list('id', flat=True))
                }
            })
        except SousCritere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            data = json.loads(request.body)
            sc.content = data.get('content') or data.get('nom') or data.get('libelle') or sc.content
            sc.reaction = data.get('reaction', sc.reaction)
            
            crit_id = data.get('critere') or data.get('critere_id') or data.get('crit_id')
            if crit_id:
                sc.critere_id = crit_id
                
            cot_id = data.get('type_cotation') or data.get('cotation_id') or data.get('cotation')
            if cot_id:
                sc.type_cotation_id = cot_id
                
            sc.save()
            
            preuves = data.get('preuves_attendues') or data.get('preuve_attendu')
            if preuves is not None:
                sc.preuve_attendu.set(preuves)
                
            if 'type_audit' in data:
                SousCritereTypeAudit.objects.filter(sous_critere=sc).delete()
                for ta_id in data['type_audit']:
                    SousCritereTypeAudit.objects.create(sous_critere=sc, type_audit_id=ta_id)
                    
            return JsonResponse({'status': 'success', 'data': {'id': sc.id, 'content': sc.content}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            sc.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaires = FormulaireAudit.objects.all().select_related(
            'processus', 'type_audit'
        ).prefetch_related('section', 'type_equipement', 'liste_sous_criteres')
        
        data = []
        for f in formulaires:
            sections = list(f.section.values('id', 'name'))
            section_names = ", ".join([s['name'] for s in sections])
            
            equipements = list(f.type_equipement.values('id', 'name'))
            equipement_names = ", ".join([e['name'] for e in equipements])
            equipement_ids = [e['id'] for e in equipements]
            
            data.append({
                'id': f.id,
                'name': f.name,
                'processus_id': f.processus.id if f.processus else None,
                'processus_name': f.processus.name if f.processus else '-',
                'type_audit_id': f.type_audit.id if f.type_audit else None,
                'type_audit_name': f.type_audit.name if f.type_audit else '-',
                'type_equipement_id': equipement_ids[0] if equipement_ids else None,
                'type_equipement_name': equipement_names or '-',
                'type_equipement_ids': equipement_ids,
                'section_names': section_names or '-',
                'sc_count': f.liste_sous_criteres.count(),
                'date_creation': f.date_creation.strftime('%d/%m/%Y %H:%M') if f.date_creation else '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            formulaire = FormulaireAudit.objects.create(
                name=data['name'],
                processus_id=data.get('processus'),
                type_audit_id=data.get('type_audit'),
                creator=request.user if request.user.is_authenticated else None
            )
            
            if data.get('type_equipement'):
                te_ids = data['type_equipement']
                if isinstance(te_ids, list):
                    formulaire.type_equipement.set(te_ids)
                else:
                    formulaire.type_equipement.set([te_ids] if te_ids else [])
            
            if data.get('sections'):
                sections = data['sections']
                if not isinstance(sections, list): sections = [sections]
                formulaire.section.set(sections)
            elif data.get('section'): # Handle singular from mobile
                formulaire.section.set([data['section']])
            
            # Handle sub-criteria links via through table
            sous_criteres = data.get('sous_criteres', [])
            for idx, sc_id in enumerate(sous_criteres):
                FormulaireSousCritere.objects.create(
                    formulaire=formulaire,
                    sous_critere_id=sc_id,
                    ordre=idx
                )
                
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire.id,
                    'name': formulaire.name,
                    'date_creation': formulaire.date_creation.strftime('%d/%m/%Y %H:%M') if formulaire.date_creation else '-'
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ListeAuditListAPIView(View):
    def get(self, request, pk=None):
        user = request.user
        if not user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)

        if pk:
            try:
                a = ListeAudit.objects.select_related('section', 'formulaire_audit', 'site', 'creator').get(pk=pk)
                return JsonResponse({
                    'status': 'success',
                    'data': {
                        'id': a.id,
                        'desc': a.desc,
                        'status': a.status,
                        'date_audit': a.date,
                        'section': a.section.id if a.section else None,
                        'departement_name': a.section.name if a.section else '-',
                        'site_id': a.site.id if a.site else None,
                        'site_name': a.site.name if a.site else '-',
                        'formulaire_audit': a.formulaire_audit.id if a.formulaire_audit else None,
                        'formulaire_name': a.formulaire_audit.name if a.formulaire_audit else 'form',
                        'en_cours': a.get_audit_status() == 'en_cours',
                        'statut_label': a.get_audit_status(),
                        'affectation': list(a.affectation.values_list('id', flat=True)),
                        'participants': list(a.participants.values_list('id', flat=True)),
                        'participants_externes': a.participants_externes or "",
                        'date_creation': a.date_creation.strftime('%d/%m/%Y') if a.date_creation else "-",
                        'creator_username': a.creator.username if a.creator else "admin"
                    }
                })
            except ListeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

        from django.db.models import Q
        if user.is_superuser:
            audits = ListeAudit.objects.all()
        else:
            audits = ListeAudit.objects.filter(Q(affectation=user) | Q(participants=user)).distinct()
            
        audits = audits.select_related('section', 'formulaire_audit', 'site').prefetch_related('resultataudit_set')
        data = []
        for a in audits:
            # Optimize status check by using prefetched set
            resultats = a.resultataudit_set.all()
            status = a.get_audit_status()
            first_res = resultats[0] if len(resultats) > 0 else None
            data.append({
                'id': a.id,
                'desc': a.desc,
                'status': status,
                'date_audit': a.date,
                'departement_name': a.section.name if a.section else '-',
                'site_name': a.site.name if a.site else '-',
                'formulaire_name': a.formulaire_audit.name if a.formulaire_audit else 'form',
                'en_cours': status == 'en_cours',
                'statut_label': status,
                'resultat_id': first_res.id if first_res else None,
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            liste_audit = ListeAudit.objects.create(
                desc=data.get('desc'),
                status=data.get('status', True),
                date=data.get('date', timezone.now()),
                section_id=data.get('section') or None,
                formulaire_audit_id=data.get('formulaire_audit') or None,
                site_id=data.get('site') or None,
                participants_externes=data.get('participants_externes') or "",
                creator=request.user if request.user.is_authenticated else None
            )

            if 'affectation' in data and data['affectation']:
                liste_audit.affectation.set(data['affectation'])
            
            if 'participants' in data and data['participants']:
                liste_audit.participants.set(data['participants'])

            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': liste_audit.id,
                    'desc': liste_audit.desc
                }
            })
        except Exception as e:
            print(f"Error creating ListeAudit: {str(e)}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def put(self, request, pk):
        try:
            data = json.loads(request.body)
            liste_audit = get_object_or_404(ListeAudit, pk=pk)
            
            liste_audit.desc = data.get('desc', liste_audit.desc)
            liste_audit.status = data.get('status', liste_audit.status)
            liste_audit.date = data.get('date', liste_audit.date)
            liste_audit.section_id = data.get('section') or None
            liste_audit.formulaire_audit_id = data.get('formulaire_audit') or None
            liste_audit.site_id = data.get('site') or None
            liste_audit.participants_externes = data.get('participants_externes') or ""
            liste_audit.save()

            if 'affectation' in data:
                liste_audit.affectation.set(data['affectation'])
            
            if 'participants' in data:
                liste_audit.participants.set(data['participants'])

            return JsonResponse({
                'status': 'success',
                'message': 'Audit updated successfully'
            })
        except Exception as e:
            print(f"Error updating ListeAudit: {str(e)}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            # We follow the same logic as the web version: only superusers can delete audits
            # However, for mobile simplicity, we might allow it if needed, 
            # but let's stick to the rule if we want high parity.
            # In ListeAuditDeleteView, it checks if request.user.is_superuser
            if not request.user.is_superuser:
                return JsonResponse({'status': 'error', 'message': 'Permission denied'}, status=403)
                
            liste_audit = get_object_or_404(ListeAudit, pk=pk)
            liste_audit.delete()
            return JsonResponse({'status': 'success', 'message': 'Audit deleted successfully'})
        except Exception as e:
            print(f"Error deleting ListeAudit: {str(e)}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditListAPIView(View):
    def get(self, request):
        # Fetch all planned audits with results prefetched
        audits = ListeAudit.objects.all().select_related('section', 'formulaire_audit', 'site').prefetch_related('affectation', 'resultataudit_set')
        
        data = []
        for a in audits:
            # Check if this audit has a result using prefetched set
            results = a.resultataudit_set.all()
            res = results[0] if results else None
            
            status = a.get_audit_status()

            data.append({
                'id': a.id,
                'audit_desc': a.desc,
                'sujet': a.desc,
                'departement_name': a.section.name if a.section else '-',
                'site_name': res.site.name if res and res.site else (a.site.name if a.site else '-'),
                'date_audit': a.date.isoformat() if a.date else None,
                'auditeur_name': a.affectation.first().username if a.affectation.exists() else 'admin',
                'formulaire_name': a.formulaire_audit.name if a.formulaire_audit else 'form',
                'status': status,
                'status_label': status.capitalize(),
                'en_cours': any(r.en_cours for r in results) if results else False,
                'has_result': res is not None,
                'resultat_id': res.id if res else None,
                'score_audit': float(res.score_audit) if res else 0.0,
                'ref_audit': a.get_reference()
            })
            
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys exist
            try:
                ListeAudit.objects.get(id=data['audit'])
            except ListeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'ListeAudit with id {data["audit"]} does not exist'}, status=400)
            
            try:
                from Organisation.models import Site
                if 'site' in data:
                    Site.objects.get(id=data['site'])
            except Site.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Site with id {data["site"]} does not exist'}, status=400)
            
            try:
                from django.contrib.auth.models import User
                User.objects.get(id=data['auditeur'])
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'User with id {data["auditeur"]} does not exist'}, status=400)
            
            resultat = ResultatAudit.objects.create(
                ref_audit=data['ref_audit'],
                audit_id=data['audit'],
                users=data['users'],
                sujet=data['sujet'],
                site_id=data.get('site'),
                auditeur_id=data['auditeur'],
                reference_gamme=data.get('reference_gamme', ''),
                processus=data.get('processus', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': resultat.id,
                    'ref_audit': resultat.ref_audit,
                    'audit': resultat.audit.id,
                    'audit_desc': resultat.audit.desc,
                    'users': resultat.users,
                    'date_audit': resultat.date_audit,
                    'score_audit': resultat.score_audit,
                    'sujet': resultat.sujet,
                    'site': resultat.site.id if resultat.site else None,
                    'auditeur': resultat.auditeur.id,
                    'reference_gamme': resultat.reference_gamme,
                    'processus': resultat.processus
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypePreuveListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_preuves = TypePreuve.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_preuves)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_preuve = TypePreuve.objects.create(
                name=data['name']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_preuve.id,
                    'name': type_preuve.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class PreuveAttenduListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        preuve_attendus = PreuveAttendu.objects.all().values(
            'id', 'name', 'type_preuve', 'type_preuve__name'
        )
        return JsonResponse({'status': 'success', 'data': list(preuve_attendus)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key if provided
            if 'type_preuve' in data:
                try:
                    TypePreuve.objects.get(id=data['type_preuve'])
                except TypePreuve.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypePreuve with id {data["type_preuve"]} does not exist'}, status=400)
            
            preuve_attendu = PreuveAttendu.objects.create(
                name=data['name'],
                type_preuve_id=data.get('type_preuve')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': preuve_attendu.id,
                    'name': preuve_attendu.name,
                    'type_preuve': preuve_attendu.type_preuve.id if preuve_attendu.type_preuve else None,
                    'type_preuve_name': preuve_attendu.type_preuve.name if preuve_attendu.type_preuve else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereTypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        sous_critere_type_audits = SousCritereTypeAudit.objects.all().values(
            'id', 'sous_critere', 'sous_critere__content', 
            'type_audit', 'type_audit__name', 'status'
        )
        return JsonResponse({'status': 'success', 'data': list(sous_critere_type_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            try:
                TypeAudit.objects.get(id=data['type_audit'])
            except TypeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'TypeAudit with id {data["type_audit"]} does not exist'}, status=400)
            
            sous_critere_type_audit = SousCritereTypeAudit.objects.create(
                sous_critere_id=data['sous_critere'],
                type_audit_id=data['type_audit'],
                status=data.get('status', 'optionnel')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere_type_audit.id,
                    'sous_critere': sous_critere_type_audit.sous_critere.id,
                    'sous_critere_content': sous_critere_type_audit.sous_critere.content,
                    'type_audit': sous_critere_type_audit.type_audit.id,
                    'type_audit_name': sous_critere_type_audit.type_audit.name,
                    'status': sous_critere_type_audit.status
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireSousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaire_sous_criteres = FormulaireSousCritere.objects.all().values(
            'id', 'formulaire', 'formulaire__name', 
            'sous_critere', 'sous_critere__content', 'ordre'
        )
        return JsonResponse({'status': 'success', 'data': list(formulaire_sous_criteres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                FormulaireAudit.objects.get(id=data['formulaire'])
            except FormulaireAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'FormulaireAudit with id {data["formulaire"]} does not exist'}, status=400)
            
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            formulaire_sous_critere = FormulaireSousCritere.objects.create(
                formulaire_id=data['formulaire'],
                sous_critere_id=data['sous_critere'],
                ordre=data.get('ordre', 0)
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire_sous_critere.id,
                    'formulaire': formulaire_sous_critere.formulaire.id,
                    'formulaire_name': formulaire_sous_critere.formulaire.name,
                    'sous_critere': formulaire_sous_critere.sous_critere.id,
                    'sous_critere_content': formulaire_sous_critere.sous_critere.content,
                    'ordre': formulaire_sous_critere.ordre
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TextRefListAPIView(View):
    def get(self, request):
        text_refs = TextRef.objects.select_related('text_ref').all()
        data = []
        for tr in text_refs:
            data.append({
                'id': tr.id,
                'norme': tr.norme,
                'text_ref': tr.text_ref.id if tr.text_ref else None,
                'file_name': tr.text_ref.name if tr.text_ref else 'N/A',
                'file_url': tr.text_ref.content.url if tr.text_ref and tr.text_ref.content else None
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            text_ref = TextRef.objects.create(
                norme=data['norme'],
                text_ref_id=data.get('text_ref')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': text_ref.id,
                    'norme': text_ref.norme,
                    'text_ref': text_ref.text_ref.id if text_ref.text_ref else None,
                    'file_name': text_ref.text_ref.name if text_ref.text_ref else 'N/A'
                }
            })
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except KeyError as e:
            return JsonResponse({'status': 'error', 'message': f'Missing field: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Server error: {str(e)}'}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class TextRefDetailAPIView(View):
    def get(self, request, pk):
        try:
            tr = TextRef.objects.select_related('text_ref').get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': tr.id,
                    'norme': tr.norme,
                    'text_ref': tr.text_ref.id if tr.text_ref else None,
                    'file_name': tr.text_ref.name if tr.text_ref else 'N/A'
                }
            })
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            tr = TextRef.objects.get(pk=pk)
            data = json.loads(request.body)
            tr.norme = data.get('norme', tr.norme)
            tr.text_ref_id = data.get('text_ref', tr.text_ref_id)
            tr.save()
            return JsonResponse({'status': 'success', 'message': 'Updated successfully'})
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            tr = TextRef.objects.get(pk=pk)
            tr.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

@method_decorator(csrf_exempt, name='dispatch')
class ActivityAPIView(View):
    def get(self, request):
        activities = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')[:10]
        data = []
        for activity in activities:
            action_type = 'add' if activity.action_flag == ADDITION else 'edit' if activity.action_flag == CHANGE else 'delete'
            data.append({
                'id': activity.id,
                'action_time': activity.action_time,
                'user': activity.user.username,
                'model': activity.content_type.model,
                'object_repr': activity.object_repr,
                'action_flag': activity.action_flag,
                'action_type': action_type,
                'change_message': activity.change_message
            })
        return JsonResponse({'status': 'success', 'data': data})
@method_decorator(csrf_exempt, name='dispatch')
class DashboardStatsAPIView(View):
    def get(self, request):
        try:
            user = request.user
            if not user.is_authenticated:
                return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)

            if user.is_superuser:
                notifications_count = ResultatAudit.objects.filter(en_cours=True).count()
                stats = {
                    'type_audits': TypeAudit.objects.count(),
                    'text_refs': TextRef.objects.count(),
                    'formulaires': FormulaireAudit.objects.count(),
                    'liste_audits': ListeAudit.objects.count(),
                    'resultats': ResultatAudit.objects.count(),
                    'notifications_count': notifications_count
                }
            else:
                from django.db.models import Avg, Q, Count
                from django.utils import timezone
                # Include audits where user is Auditor OR Participant
                audits_assigned = ListeAudit.objects.filter(Q(affectation=user) | Q(participants=user)).distinct()
                
                local_now = timezone.localtime(timezone.now())
                today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
                planifies = audits_assigned.exclude(resultataudit__isnull=False).filter(date__gte=today_start).count()
                en_cours = audits_assigned.filter(resultataudit__en_cours=True, date__gte=today_start).distinct().count()
                termines = audits_assigned.filter(resultataudit__en_cours=False).exclude(resultataudit__en_cours=True).distinct().count()
                en_retard = audits_assigned.filter(
                    Q(resultataudit__isnull=True) | Q(resultataudit__en_cours=True),
                    date__lt=today_start
                ).distinct().count()
                
                # Score average remains for results of audits assigned to the user
                completed_results = ResultatAudit.objects.filter(audit__in=audits_assigned, en_cours=False)
                score_moy = completed_results.aggregate(Avg('score_audit'))['score_audit__avg']
                
                # Notifications count logic matching context_processors.py
                notif_count = audits_assigned.filter(resultataudit__isnull=True).count()

                stats = {
                    'planifies': planifies,
                    'en_cours': en_cours,
                    'termines': termines,
                    'en_retard': en_retard,
                    'score_moy': round(float(score_moy) * 100, 1) if score_moy is not None else "0.0",
                    'notifications_count': notif_count
                }
                
            return JsonResponse({'status': 'success', 'data': stats})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class NotificationsAPIView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
        
        notifs = []
        user = request.user
        local_now = timezone.localtime(timezone.now())
        today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        def make_aware_if_naive(dt):
            if dt and timezone.is_naive(dt):
                return timezone.make_aware(dt, timezone.get_current_timezone())
            return dt

        if user.is_superuser:
            # 1. En Retard (planned and overdue)
            late_audits = ListeAudit.objects.filter(
                Q(resultataudit__isnull=True) | Q(resultataudit__en_cours=True),
                date__lt=today_start
            ).distinct().order_by('-date_creation')[:10]
            for p in late_audits:
                formatted_date = p.date.strftime('%d/%m/%Y')
                notifs.append({
                    'id': f"late-{p.id}",
                    'message': f"L'audit '{p.desc}' (prévu le {formatted_date}) est en retard !",
                    'type': 'audit_late',
                    'target_id': p.id,
                    'date': p.date.strftime('%Y-%m-%d %H:%M:%S') if p.date else None,
                    'date_sort': make_aware_if_naive(p.date_creation or p.date)
                })
                
            # 2. Started (in progress)
            recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=True).order_by('-date_audit')[:10]
            for r in recent_started:
                notifs.append({
                    'id': f"res-start-{r.id}",
                    'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                    'type': 'audit_started',
                    'target_id': r.id,
                    'date': r.date_audit.strftime('%Y-%m-%d %H:%M:%S') if r.date_audit else None,
                    'date_sort': make_aware_if_naive(r.date_audit)
                })
                
            # 3. Finished (completed)
            recent_finished = ResultatAudit.objects.select_related('auditeur', 'audit').filter(en_cours=False).order_by('-date_audit')[:10]
            for r in recent_finished:
                score_pct = round(r.score_audit * 100) if r.score_audit else 0
                notifs.append({
                    'id': f"res-finish-{r.id}",
                    'message': f"L'auditeur {r.auditeur.username if r.auditeur else 'Inconnu'} a finalisé l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')} (Score: {score_pct}%)",
                    'type': 'audit_finished',
                    'target_id': r.id,
                    'date': r.date_audit.strftime('%Y-%m-%d %H:%M:%S') if r.date_audit else None,
                    'date_sort': make_aware_if_naive(r.date_audit)
                })
                
        else:
            # For Auditeur / Participant
            # 1. En Retard (planned and overdue)
            late_audits = ListeAudit.objects.filter(
                Q(affectation=user) | Q(participants=user),
                Q(resultataudit__isnull=True) | Q(resultataudit__en_cours=True),
                date__lt=today_start
            ).distinct().order_by('-date_creation')[:10]
            for p in late_audits:
                formatted_date = p.date.strftime('%d/%m/%Y')
                notifs.append({
                    'id': f"late-{p.id}",
                    'message': f"Votre audit '{p.desc}' (prévu le {formatted_date}) est en retard !",
                    'type': 'audit_late',
                    'target_id': p.id,
                    'date': p.date.strftime('%Y-%m-%d %H:%M:%S') if p.date else None,
                    'date_sort': make_aware_if_naive(p.date_creation or p.date)
                })
                
            # 2. Started (in progress)
            recent_started = ResultatAudit.objects.select_related('auditeur', 'audit').filter(
                Q(co_auditeur=user) | Q(audites=user) | Q(auditeur=user),
                en_cours=True
            ).order_by('-date_audit')[:10]
            for r in recent_started:
                notifs.append({
                    'id': f"res-start-{r.id}",
                    'message': f"Vous avez démarré l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')}",
                    'type': 'audit_started',
                    'target_id': r.id,
                    'date': r.date_audit.strftime('%Y-%m-%d %H:%M:%S') if r.date_audit else None,
                    'date_sort': make_aware_if_naive(r.date_audit)
                })
                
            # 3. Finished (completed)
            recent_finished = ResultatAudit.objects.select_related('auditeur', 'audit').filter(
                Q(co_auditeur=user) | Q(audites=user) | Q(auditeur=user),
                en_cours=False
            ).order_by('-date_audit')[:10]
            for r in recent_finished:
                score_pct = round(r.score_audit * 100) if r.score_audit else 0
                notifs.append({
                    'id': f"res-finish-{r.id}",
                    'message': f"Vous avez finalisé l'audit {r.sujet or (r.audit.desc if r.audit else 'sans nom')} (Score: {score_pct}%)",
                    'type': 'audit_finished',
                    'target_id': r.id,
                    'date': r.date_audit.strftime('%Y-%m-%d %H:%M:%S') if r.date_audit else None,
                    'date_sort': make_aware_if_naive(r.date_audit)
                })
                
            # 4. Planned but not overdue
            planifies = ListeAudit.objects.filter(
                Q(affectation=user) | Q(participants=user), 
                resultataudit__isnull=True,
                date__gte=today_start
            ).distinct().order_by('-date_creation')[:10]
            for p in planifies:
                notifs.append({
                    'id': f"plan-{p.id}",
                    'message': f"Un nouvel audit a été planifié pour vous : {p.desc}",
                    'type': 'audit_planned',
                    'target_id': p.id,
                    'date': p.date.strftime('%Y-%m-%d %H:%M:%S') if p.date else None,
                    'date_sort': make_aware_if_naive(p.date_creation or p.date)
                })
                
        # Sort all notifications from newest to oldest
        notifs.sort(key=lambda x: x['date_sort'], reverse=True)
        
        # Strip the date_sort key before returning
        for n in notifs:
            n.pop('date_sort', None)
            
        return JsonResponse({'status': 'success', 'data': notifs[:15]})

@method_decorator(csrf_exempt, name='dispatch')
class ChartDataAPIView(View):
    def get(self, request):
        try:
            year = int(request.GET.get('year', 2026))
            labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
            
            datasets = {
                'types_audit': [0] * 12,
                'formulaires': [0] * 12,
                'audits_planifies': [0] * 12,
                'resultats': [0] * 12,
            }

            # Fill data (Simple count for now, can be improved with created_at filtering)
            # Since we might not have created_at on all models, we just provide the total spread out
            # Or better, if models have auto_now_add=True
            
            # Example for ResultatAudit which likely has date_audit
            res = ResultatAudit.objects.filter(date_audit__year=year)
            for item in res:
                if item.date_audit:
                    month = item.date_audit.month
                    datasets['resultats'][month-1] += 1

            # For others, if they don't have dates, we'll just put them in current month for demo
            import datetime
            now = datetime.datetime.now()
            current_month = now.month
            
            # Use current month if year matches, otherwise don't show
            if year == now.year:
                datasets['types_audit'][current_month-1] = TypeAudit.objects.count()
                datasets['formulaires'][current_month-1] = FormulaireAudit.objects.count()
                datasets['audits_planifies'][current_month-1] = ListeAudit.objects.count()

            return JsonResponse({
                'status': 'success',
                'labels': labels,
                'datasets': datasets
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class CotationListAPIView(View):
    def get(self, request):
        cotations = Cotation.objects.all().select_related('type_cotation')
        data = []
        for c in cotations:
            data.append({
                'id': c.id,
                'valeur': c.valeur,
                'content': c.content,
                'code': c.code,
                'type_cotation_id': c.type_cotation.id if c.type_cotation else None,
                'type_cotation_name': c.type_cotation.name if c.type_cotation else None
            })
        return JsonResponse({'status': 'success', 'data': data})

    def post(self, request):
        try:
            data = json.loads(request.body)
            c = Cotation.objects.create(
                valeur=data['valeur'],
                content=data['content'],
                code=data['code'],
                type_cotation_id=data.get('type_cotation')
            )
            return JsonResponse({'status': 'success', 'message': 'Created'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def put(self, request, pk):
        try:
            c = Cotation.objects.get(pk=pk)
            data = json.loads(request.body)
            c.valeur = data.get('valeur', c.valeur)
            c.content = data.get('content', c.content)
            c.code = data.get('code', c.code)
            c.type_cotation_id = data.get('type_cotation', c.type_cotation_id)
            c.save()
            return JsonResponse({'status': 'success', 'message': 'Updated'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = Cotation.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditDetailAPIView(View):
    def get(self, request, pk):
        try:
            f = FormulaireAudit.objects.prefetch_related('section', 'type_equipement', 'liste_sous_criteres').get(pk=pk)
            sections = [s.id for s in f.section.all()]
            equipements = [e.id for e in f.type_equipement.all()]
            scs = [sc.id for sc in f.liste_sous_criteres.all()]
            return JsonResponse({'status': 'success', 'data': {
                'id': f.id,
                'name': f.name,
                'processus_id': f.processus.id if f.processus else None,
                'type_audit_id': f.type_audit.id if f.type_audit else None,
                'type_equipement_id': equipements[0] if equipements else None,
                'type_equipement_ids': equipements,
                'section_id': sections[0] if sections else None,
                'sections_ids': sections,
                'sous_criteres_ids': scs
            }})
        except FormulaireAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            f = FormulaireAudit.objects.get(pk=pk)
            data = json.loads(request.body)
            f.name = data.get('name', f.name)
            f.processus_id = data.get('processus', f.processus_id)
            f.type_audit_id = data.get('type_audit', f.type_audit_id)
            f.save()
            
            if 'type_equipement' in data:
                te_ids = data['type_equipement']
                if isinstance(te_ids, list):
                    f.type_equipement.set(te_ids)
                else:
                    f.type_equipement.set([te_ids] if te_ids else [])

            if 'section' in data:
                sections = data['section']
                if not isinstance(sections, list): sections = [sections]
                f.section.set(sections)
            elif 'sections' in data:
                sections = data['sections']
                if not isinstance(sections, list): sections = [sections]
                f.section.set(sections)
            
            if 'sous_criteres' in data:
                # Update through table
                FormulaireSousCritere.objects.filter(formulaire=f).delete()
                for idx, sc_id in enumerate(data['sous_criteres']):
                    FormulaireSousCritere.objects.create(
                        formulaire=f,
                        sous_critere_id=sc_id,
                        ordre=idx
                    )
            return JsonResponse({'status': 'success', 'data': {'id': f.id, 'name': f.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            f = FormulaireAudit.objects.get(pk=pk)
            f.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditCopyAPIView(View):
    def post(self, request, pk):
        import re
        try:
            original_form = FormulaireAudit.objects.get(pk=pk)
            original_name = original_form.name
            base_name = re.sub(r' - Copie( \d+)?$', '', original_name)
            
            existing_copies = FormulaireAudit.objects.filter(name__startswith=f"{base_name} - Copie")
            last_number = 0
            for copy in existing_copies:
                match = re.search(r' - Copie (\d+)$', copy.name)
                if match:
                    num = int(match.group(1))
                    if num > last_number:
                        last_number = num
                elif copy.name == f"{base_name} - Copie":
                    if last_number < 1: last_number = 1
            
            new_nom = f"{base_name} - Copie {last_number + 1}"
            
            # Deep copy
            new_form = FormulaireAudit.objects.get(pk=original_form.pk)
            new_form.pk = None
            new_form.name = new_nom
            new_form.save()
            new_form.section.set(original_form.section.all())
            
            fsc_associations = FormulaireSousCritere.objects.filter(formulaire=original_form).order_by('ordre')
            critere_map = {}

            for assoc in fsc_associations:
                old_sc = assoc.sous_critere
                old_crit = old_sc.critere
                
                if old_crit.id not in critere_map:
                    new_crit = Critere.objects.get(pk=old_crit.pk)
                    new_crit.pk = None
                    new_crit.formulaire = new_form
                    new_crit.save()
                    critere_map[old_crit.id] = new_crit
                else:
                    new_crit = critere_map[old_crit.id]
                
                new_sc = SousCritere.objects.get(pk=old_sc.pk)
                new_sc.pk = None
                new_sc.critere = new_crit
                new_sc.save()
                
                FormulaireSousCritere.objects.create(
                    formulaire=new_form,
                    sous_critere=new_sc,
                    ordre=assoc.ordre
                )
                
            return JsonResponse({'status': 'success', 'message': 'Copied', 'new_id': new_form.id, 'new_name': new_form.name})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)



@method_decorator(csrf_exempt, name='dispatch')
class TypeCotationDetailAPIView(View):
    def get(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': tc.id, 'name': tc.name}})
        except TypeCotation.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            data = json.loads(request.body)
            tc.name = data.get('name', tc.name)
            tc.save()
            return JsonResponse({'status': 'success', 'data': {'id': tc.id, 'name': tc.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            tc.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class ListeAuditStartAPIView(View):
    @transaction.atomic
    def post(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
            
        liste_audit = get_object_or_404(ListeAudit, pk=pk)

        # Permission check
        if not request.user.is_superuser and not liste_audit.affectation.filter(pk=request.user.pk).exists():
            return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)

        # Prevent duplicate start
        existing = ResultatAudit.objects.filter(audit=liste_audit).first()
        if existing:
            return JsonResponse({
                'status': 'success',
                'message': 'Audit already started',
                'resultat_id': existing.pk
            })

        # Extract commentaire
        try:
            data = json.loads(request.body)
            commentaire = data.get('commentaire', '')
        except:
            commentaire = request.POST.get('commentaire', '')

        # Create ResultatAudit
        resultat = ResultatAudit.objects.create(
            ref_audit=liste_audit.pk,
            audit=liste_audit,
            users=str(request.user),
            sujet=liste_audit.desc,
            auditeur=request.user,
            site=getattr(liste_audit, "site", None),
            commentaire=commentaire,
            en_cours=True
        )

        # Generate detail rows
        formulaire = liste_audit.formulaire_audit
        if not formulaire:
            return JsonResponse({"status": "error", "message": "Aucun formulaire associé à cet audit"}, status=400)

        details = []
        fscs = formulaire.formulairesouscritere_set.select_related(
            "sous_critere__critere",
            "sous_critere__critere__chapitre_norme",
            "sous_critere__critere__chapitre_norme__text_ref",
        ).order_by('ordre')

        if fscs.exists():
            for fs in fscs:
                sc = fs.sous_critere
                if not sc: continue
                details.append(
                    DetailResultatAudit(
                        resultat_audit=resultat,
                        critere=sc.critere.name if sc.critere else "",
                        norme=sc.critere.chapitre_norme.text_ref.norme if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref else "",
                        sous_critere=sc.content,
                        chapitre_norme=sc.critere.chapitre_norme.name if sc.critere and sc.critere.chapitre_norme else "",
                        text_ref_url=sc.critere.chapitre_norme.text_ref.text_ref.content.url if sc.critere and sc.critere.chapitre_norme and sc.critere.chapitre_norme.text_ref and sc.critere.chapitre_norme.text_ref.text_ref and sc.critere.chapitre_norme.text_ref.text_ref.content else "",
                        value=0,
                        value_max=getattr(sc, 'valeur_max', 1),
                        cotation="",
                        cotation_option=[],
                    )
                )
        else:
            for crit in formulaire.criteres.all():
                for sc in crit.souscritere_set.all():
                    details.append(
                        DetailResultatAudit(
                            resultat_audit=resultat,
                            critere=crit.name,
                            norme=crit.chapitre_norme.text_ref.norme if crit.chapitre_norme and crit.chapitre_norme.text_ref else "",
                            sous_critere=sc.content,
                            chapitre_norme=crit.chapitre_norme.name if crit.chapitre_norme else "",
                            value=0,
                            value_max=1,
                            cotation="",
                            cotation_option=[],
                        )
                    )

        if details:
            DetailResultatAudit.objects.bulk_create(details)

        return JsonResponse({
            'status': 'success',
            'message': 'Audit started successfully',
            'resultat_id': resultat.pk
        })

@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditDetailAPIView(View):
    def get(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
            
        resultat = get_object_or_404(ResultatAudit, pk=pk)
        
        # Check permissions: allow superuser, lead auditor, co-auditors, and participants
        user = request.user
        if not user.is_superuser:
            is_lead = resultat.auditeur == user
            is_co = resultat.co_auditeur.filter(pk=user.pk).exists()
            is_participant = resultat.audites.filter(pk=user.pk).exists()
            is_liste_affectation = resultat.audit and resultat.audit.affectation.filter(pk=user.pk).exists()
            is_liste_participant = resultat.audit and resultat.audit.participants.filter(pk=user.pk).exists()
            
            if not (is_lead or is_co or is_participant or is_liste_affectation or is_liste_participant):
                return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)
            
        details = resultat.detailresultataudit_set.all().order_by('id')
        
        details_data = []
        for d in details:
            # Get cotation options for the sous-critere if available
            # This logic mimics the web version's way of finding cotations
            cotations = []
            # We search for the SousCritere to get its type_cotation
            try:
                # We have to find the original SousCritere. 
                # Since DetailResultatAudit stores content, we match by content and ResultatAudit's form
                sc = SousCritere.objects.filter(content=d.sous_critere).first()
                if sc and sc.type_cotation:
                    cots = Cotation.objects.filter(type_cotation=sc.type_cotation)
                    for c in cots:
                        cotations.append({
                            'id': c.id,
                            'code': c.code,
                            'content': c.content,
                            'valeur': c.valeur
                        })
                
                # Fetch Real Preuve Attendue
                preuves_att = []
                if sc:
                    for pa in sc.preuve_attendu.all():
                        preuves_att.append(f"{pa.name} ({pa.type_preuve.name if pa.type_preuve else ''})")
                preuve_text = " • ".join(preuves_att) if preuves_att else "Aucune preuve spécifiée"
            except:
                preuve_text = "Aucune preuve spécifiée"
                pass

            # Resolve pdf_page from ChapitreNorme by matching name stored on the detail row
            pdf_page = 1
            if d.chapitre_norme:
                try:
                    chapitre = ChapitreNorme.objects.filter(name=d.chapitre_norme).first()
                    if chapitre and chapitre.page:
                        pdf_page = chapitre.page
                except Exception:
                    pass

            details_data.append({
                'id': d.id,
                'critere': d.critere,
                'norme': d.norme,
                'sous_critere': d.sous_critere,
                'chapitre_norme': d.chapitre_norme,
                'text_ref_url': d.text_ref_url,
                'pdf_page': pdf_page,
                'commentaire': d.commentaire,
                'cotation': d.cotation,
                'code': d.code,
                'value': d.value,
                'value_max': d.value_max,
                'cotations': cotations,
                'preuve_attendu': preuve_text,
                'evidences': [{'id': e.id, 'url': e.file.url} for e in d.evidences.all()]
            })
            
        data = {
            'id': resultat.id,
            'sujet': resultat.sujet,
            'date_audit': resultat.date_audit,
            'score_audit': float(resultat.score_audit),
            'auditeur': resultat.auditeur.get_full_name() or resultat.auditeur.username,
            'participants': ", ".join(filter(None, [
                ", ".join([u.get_full_name() or u.username for u in resultat.audit.participants.all()]),
                resultat.audit.participants_externes
            ])) or "Aucun",
            'site': resultat.site.name if resultat.site else None,
            'en_cours': resultat.en_cours,
            'commentaire': resultat.commentaire,
            'point_fort': resultat.point_fort,
            'point_sensible': resultat.point_sensible,
            'risque': resultat.risque,
            'opportunite': resultat.opportunite,
            'details': details_data
        }
        
        return JsonResponse({'status': 'success', 'data': data})

    def delete(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
            
        resultat = get_object_or_404(ResultatAudit, pk=pk)
        
        # Check permissions (only superuser can delete results, matching web logic)
        if not request.user.is_superuser:
            return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)
            
        resultat.delete()
        return JsonResponse({'status': 'success', 'message': 'Resultat deleted'})

@method_decorator(csrf_exempt, name='dispatch')
class DetailResultatAuditUpdateAPIView(View):
    def post(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
            
        detail = get_object_or_404(DetailResultatAudit, pk=pk)
        resultat = detail.resultat_audit

        if not resultat.en_cours:
            return JsonResponse({'status': 'error', 'message': 'Audit is closed'}, status=403)

        user = request.user
        if not user.is_superuser:
            is_lead = resultat.auditeur == user
            is_co = resultat.co_auditeur.filter(pk=user.pk).exists()
            is_participant = resultat.audites.filter(pk=user.pk).exists()
            is_liste_affectation = resultat.audit and resultat.audit.affectation.filter(pk=user.pk).exists()
            is_liste_participant = resultat.audit and resultat.audit.participants.filter(pk=user.pk).exists()
            
            if not (is_lead or is_co or is_participant or is_liste_affectation or is_liste_participant):
                return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)

        try:
            # Handle both JSON and Form data (for file uploads)
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST

            if "commentaire" in data:
                detail.commentaire = data.get("commentaire")
            if "cotation" in data:
                detail.cotation = data.get("cotation")
            if "code" in data:
                detail.code = data.get("code")
            if "value" in data:
                try:
                    detail.value = float(data.get("value", 0))
                except (ValueError, TypeError):
                    pass

            if "justificatif" in request.FILES:
                files = request.FILES.getlist("justificatif")
                for f in files:
                    EvidenceAudit.objects.create(detail=detail, file=f)
            
            if data.get("delete_justificatif") == "true":
                EvidenceAudit.objects.filter(detail=detail).delete()
                detail.justificatif = None

            detail.save()
            resultat.recalculate_score()

            return JsonResponse({
                "status": "success",
                "score": float(resultat.score_audit),
                "detail_id": detail.id,
                "evidences": [{'id': e.id, 'url': e.file.url} for e in detail.evidences.all()]
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditFinishAPIView(View):
    def post(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
            
        resultat = get_object_or_404(ResultatAudit, pk=pk)
        
        user = request.user
        if not user.is_superuser:
            is_lead = resultat.auditeur == user
            is_co = resultat.co_auditeur.filter(pk=user.pk).exists()
            is_participant = resultat.audites.filter(pk=user.pk).exists()
            is_liste_affectation = resultat.audit and resultat.audit.affectation.filter(pk=user.pk).exists()
            is_liste_participant = resultat.audit and resultat.audit.participants.filter(pk=user.pk).exists()
            
            if not (is_lead or is_co or is_participant or is_liste_affectation or is_liste_participant):
                return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)
            
        import json
        try:
            data = json.loads(request.body)
        except:
            data = request.POST

        resultat.point_fort = data.get('point_fort', resultat.point_fort)
        resultat.point_sensible = data.get('point_sensible', resultat.point_sensible)
        resultat.risque = data.get('risque', resultat.risque)
        resultat.opportunite = data.get('opportunite', resultat.opportunite)
        
        resultat.en_cours = False
        resultat.recalculate_score()
        resultat.save()
        
        return JsonResponse({'status': 'success', 'message': 'Audit finished'})

@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditAISuggestionsAPIView(View):
    def get(self, request, pk):
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
        
        resultat = get_object_or_404(ResultatAudit, pk=pk)
        
        user = request.user
        if not user.is_superuser:
            is_lead = resultat.auditeur == user
            is_co = resultat.co_auditeur.filter(pk=user.pk).exists()
            is_participant = resultat.audites.filter(pk=user.pk).exists()
            is_liste_affectation = resultat.audit and resultat.audit.affectation.filter(pk=user.pk).exists()
            is_liste_participant = resultat.audit and resultat.audit.participants.filter(pk=user.pk).exists()
            
            if not (is_lead or is_co or is_participant or is_liste_affectation or is_liste_participant):
                return JsonResponse({'status': 'error', 'message': 'Forbidden'}, status=403)
        details = resultat.detailresultataudit_set.all()
        
        # Simple heuristic analysis (copying logic from web view)
        criteria_performance = {}
        for d in details:
            c_name = d.critere if d.critere else "Général"
            if c_name not in criteria_performance:
                criteria_performance[c_name] = {'total': 0, 'count': 0}
            if d.value is not None and d.value >= 0:
                criteria_performance[c_name]['total'] += d.value
                criteria_performance[c_name]['count'] += 1

        ranked_criteria = []
        for name, stats in criteria_performance.items():
            if stats['count'] > 0:
                ranked_criteria.append({'name': name, 'avg': stats['total'] / stats['count']})
        
        ranked_criteria.sort(key=lambda x: x['avg'], reverse=True)
        top_criteres = [c['name'] for c in ranked_criteria if c['avg'] >= 0.8][:2]
        low_criteres = [c['name'] for c in ranked_criteria if c['avg'] < 0.5][:2]

        pf_text = "Maîtrise démontrée sur : " + ", ".join(top_criteres) if top_criteres else "Conformité générale correcte."
        ps_text = "Points de vigilance sur les critères intermédiaires."
        risk_text = "Écarts identifiés sur : " + ", ".join(low_criteres) if low_criteres else "Aucun risque majeur immédiat."
        opp_text = "Continuer la démarche d'amélioration continue."

        return JsonResponse({
            "point_fort": pf_text,
            "point_sensible": ps_text,
            "risque": risk_text,
            "opportunite": opp_text
        })
